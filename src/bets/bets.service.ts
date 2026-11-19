import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { nowLocalDateTime } from '../common/persistence/local-date-time.transformer';
import { FanPaymentMethodsService } from '../fan-payment-methods/fan-payment-methods.service';
import { Fan } from '../fans/entities/fan.entity';
import { FansService } from '../fans/fans.service';
import { MatchResponseDto } from '../matches/dto/match-response.dto';
import {
  MATCH_STATUS_LABEL,
  MatchStatus,
} from '../matches/entities/match-status.enum';
import { matchLabel } from '../matches/match-label';
import { MatchesService } from '../matches/matches.service';
import { betPlacedEmail } from '../notifications/bet-emails';
import { NotificationClient } from '../notifications/notification.client';
import { AuthenticatedUser } from '../security/authenticated-user';
import { toBetResponse } from './bets.mapper';
import { CreateBetDto, UpdateBetDto } from './dto/bet-fields.dto';
import { BetResponseDto } from './dto/bet-response.dto';
import { Bet } from './entities/bet.entity';
import {
  BET_STATUS_LABEL,
  BetSelection,
  BetStatus,
} from './entities/bet.enums';

// Lo que se carga de una apuesta para responderla.
const BET_RELATIONS = {
  fan: true,
  match: { phase: { tournament: true }, homeTeam: true, awayTeam: true },
  paymentMethod: { paymentMethod: true },
};

// HU-GC-11 · Apuestas. El aficionado apuesta, consulta, modifica y cancela las suyas (sale del token:
// la de otro responde 404). La liquidación no está aquí: la hace BetSettlementService cuando se
// registra el resultado del partido o se cancela.
@Injectable()
export class BetsService {
  constructor(
    @InjectRepository(Bet)
    private readonly betRepository: Repository<Bet>,
    private readonly matchesService: MatchesService,
    private readonly fansService: FansService,
    private readonly fanPaymentMethodsService: FanPaymentMethodsService,
    private readonly notifications: NotificationClient,
  ) {}

  // Partidos que hoy reciben apuestas, con sus cuotas (criterio 3).
  availableMatches(): Promise<MatchResponseDto[]> {
    return this.matchesService.findOpenForBetting();
  }

  // La cuota se copia del partido en este momento y no cambia nunca (criterio 11).
  async create(
    user: AuthenticatedUser,
    dto: CreateBetDto,
  ): Promise<BetResponseDto> {
    const fan = await this.fansService.resolve(user);
    const match = await this.matchesService.findOne(dto.matchId); // 404 si no existe
    const odds = oddsFor(match, dto.selection);
    const method = await this.fanPaymentMethodsService.findUsable(
      fan,
      dto.fanPaymentMethodId,
    );

    const saved = await this.betRepository.save(
      this.betRepository.create({
        fan: { id: fan.id },
        match: { id: match.id },
        paymentMethod: { id: method.id },
        selection: dto.selection,
        amount: dto.amount,
        odds,
      }),
    );
    const bet = toBetResponse(await this.findOwn(fan, saved.id));
    this.notifications.deliver([betPlacedEmail(bet)], 'apuesta registrada');
    return bet;
  }

  // Las del aficionado, de la más reciente a la más antigua.
  async findMine(user: AuthenticatedUser): Promise<BetResponseDto[]> {
    const fan = await this.fansService.resolve(user);
    const bets = await this.betRepository.find({
      where: { fan: { id: fan.id } },
      relations: BET_RELATIONS,
      order: { id: 'DESC' },
    });
    return bets.map(toBetResponse);
  }

  async findOne(user: AuthenticatedUser, id: number): Promise<BetResponseDto> {
    const fan = await this.fansService.resolve(user);
    return toBetResponse(await this.findOwn(fan, id));
  }

  // Solo el valor y el método de pago, mientras el partido no haya empezado (criterio 14).
  async update(
    user: AuthenticatedUser,
    id: number,
    dto: UpdateBetDto,
  ): Promise<BetResponseDto> {
    const fan = await this.fansService.resolve(user);
    const bet = await this.findOwn(fan, id);
    ensureChangeable(bet, 'modificar');
    const method = await this.fanPaymentMethodsService.findUsable(
      fan,
      dto.fanPaymentMethodId,
    );

    await this.betRepository.update(id, {
      amount: dto.amount,
      paymentMethod: { id: method.id },
    });
    return toBetResponse(await this.findOwn(fan, id));
  }

  // Antes de que empiece el partido (criterio 15): se devuelve lo apostado.
  async cancel(user: AuthenticatedUser, id: number): Promise<BetResponseDto> {
    const fan = await this.fansService.resolve(user);
    const bet = await this.findOwn(fan, id);
    ensureChangeable(bet, 'cancelar');

    await this.betRepository.update(id, {
      status: BetStatus.CANCELADA,
      payout: bet.amount,
      settledAt: new Date(),
    });
    return toBetResponse(await this.findOwn(fan, id));
  }

  // Para el administrador: las apuestas de un partido, en el orden en que se hicieron (criterio 13).
  async findByMatch(matchId: number): Promise<BetResponseDto[]> {
    await this.matchesService.findOne(matchId); // 404 si el partido no existe
    const bets = await this.betRepository.find({
      where: { match: { id: matchId } },
      relations: BET_RELATIONS,
      order: { id: 'ASC' },
    });
    return bets.map(toBetResponse);
  }

  // ---------------------------------------------------------------------------------------------

  private async findOwn(fan: Fan, id: number): Promise<Bet> {
    const bet = await this.betRepository.findOne({
      where: { id, fan: { id: fan.id } },
      relations: BET_RELATIONS,
    });
    if (!bet) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No tienes una apuesta con id ${id}`,
      );
    }
    return bet;
  }
}

// La cuota de la selección si el partido recibe apuestas: programado, con cuotas, con las apuestas
// abiertas y sin haber llegado su hora (criterios 2 y 10). En una fase final no hay empate.
function oddsFor(match: MatchResponseDto, selection: BetSelection): number {
  const label = matchLabel(match);
  if (match.status !== MatchStatus.PROGRAMADO) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `El partido ${label} está ${MATCH_STATUS_LABEL[match.status]}: ya no recibe apuestas`,
    );
  }
  if (!match.betting) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `El partido ${label} todavía no tiene cuotas: no recibe apuestas`,
    );
  }
  if (!match.betting.open) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `Las apuestas del partido ${label} están cerradas`,
    );
  }
  if (match.scheduledAt <= nowLocalDateTime()) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `Ya llegó la hora del partido ${label}: no recibe apuestas`,
    );
  }

  if (selection === BetSelection.LOCAL) {
    return match.betting.homeOdds;
  }
  if (selection === BetSelection.VISITANTE) {
    return match.betting.awayOdds;
  }
  if (match.betting.drawOdds === null) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `En "${match.phase.name}" no hay empate (fase final): apuesta por el local o por el visitante`,
    );
  }
  return match.betting.drawOdds;
}

// Una apuesta se modifica o se cancela solo si sigue pendiente y su partido no ha empezado.
function ensureChangeable(bet: Bet, action: string): void {
  if (bet.status !== BetStatus.PENDIENTE) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `La apuesta ya está ${BET_STATUS_LABEL[bet.status]}: no se puede ${action}`,
    );
  }
  const { match } = bet;
  if (
    match.status !== MatchStatus.PROGRAMADO ||
    match.scheduledAt <= nowLocalDateTime()
  ) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `El partido ${matchLabel(match)} ya empezó: la apuesta ya no se puede ${action}`,
    );
  }
}
