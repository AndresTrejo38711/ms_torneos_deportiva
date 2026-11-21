import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { winningSelection } from '../bets/bet-rules';
import { BetSettlementService } from '../bets/bet-settlement.service';
import { BetUsageService } from '../bets/bet-usage.service';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { resultEmails } from '../notifications/match-emails';
import { NotificationClient } from '../notifications/notification.client';
import { PhaseType } from '../phases/entities/phase-type.enum';
import { ScoreTotalsService } from '../scores/score-totals.service';
import { TicketUsageService } from '../tickets/ticket-usage.service';
import { MatchResponseDto } from './dto/match-response.dto';
import { RegisterResultDto } from './dto/register-result.dto';
import { MatchStatus } from './entities/match-status.enum';
import { Match } from './entities/match.entity';
import { matchLabel } from './match-label';
import { MatchesService } from './matches.service';

type Penalties = { home: number | null; away: number | null };

// HU-GC-07 · El resultado oficial de un partido. Está aparte de MatchesService (que programa y
// cambia el estado de los partidos) porque es otra HU con sus propias reglas (S de SOLID).
// Al registrarlo se liquidan las apuestas del partido (HU-GC-11) y se avisa a quienes apostaron o
// compraron boletos (HU-GE-04).
@Injectable()
export class MatchResultsService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly matchesService: MatchesService,
    private readonly scoreTotals: ScoreTotalsService,
    private readonly betUsage: BetUsageService,
    private readonly betSettlement: BetSettlementService,
    private readonly notifications: NotificationClient,
    private readonly ticketUsage: TicketUsageService,
  ) {}

  // Registrar (partido EN_JUEGO → FINALIZADO) o corregir (partido ya FINALIZADO).
  async register(
    id: number,
    dto: RegisterResultDto,
  ): Promise<MatchResponseDto> {
    const match = await this.matchesService.findOne(id);
    if (match.status === MatchStatus.FINALIZADO) {
      await this.ensureCorrectable(match);
    } else if (match.status === MatchStatus.PROGRAMADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} todavía no ha empezado: inícialo antes de registrar su resultado`,
      );
    } else if (match.status === MatchStatus.CANCELADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} está cancelado: no tiene resultado`,
      );
    }

    const penalties = this.validatePenalties(match, dto);
    await this.ensureScoresFit(match, dto);

    // El resultado y la liquidación van en la misma transacción: quedan los dos o ninguno. Al
    // corregir no queda ninguna apuesta pendiente (ensureCorrectable lo garantiza), así que no se
    // liquida nada dos veces.
    const result = {
      homeScore: dto.homeScore,
      awayScore: dto.awayScore,
      homePenalties: penalties.home,
      awayPenalties: penalties.away,
    };
    const settled = await this.matchRepository.manager.transaction(
      async (manager) => {
        await manager.update(Match, id, {
          ...result,
          status: MatchStatus.FINALIZADO,
        });
        return this.betSettlement.settle(id, winningSelection(result), manager);
      },
    );

    const response = await this.matchesService.findOne(id);
    const ticketHolders = await this.ticketUsage.fanEmailsForMatch(id);
    this.notifications.deliver(
      resultEmails(response, settled, ticketHolders),
      'resultado del partido',
    );
    return response;
  }

  // ---------------------------------------------------------------------------------------------

  // "Cuando las reglas de la competencia lo permitan": un resultado se corrige mientras sus apuestas
  // no se hayan liquidado (una apuesta no se liquida dos veces, HU-GC-11) y ninguna fase posterior
  // del torneo tenga partidos (si la siguiente ya se armó, cambiarlo podría cambiar quién clasificó).
  private async ensureCorrectable(match: MatchResponseDto): Promise<void> {
    const settled = await this.betUsage.countSettledForMatch(match.id);
    if (settled > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El resultado de ${matchLabel(match)} ya no se puede corregir: sus apuestas ya se liquidaron (${settled}) y una apuesta no se liquida dos veces`,
      );
    }

    const later = await this.matchRepository.findOne({
      where: {
        phase: {
          tournament: { id: match.tournament.id },
          order: MoreThan(match.phase.order),
        },
      },
      relations: { phase: true },
      order: { phase: { order: 'ASC' } },
    });
    if (later) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El resultado de ${matchLabel(match)} ya no se puede corregir: "${later.phase.name}" ya tiene partidos, y cambiarlo podría cambiar quién clasificó`,
      );
    }
  }

  // En fase de grupos no hay penales (el empate vale 1 punto). En fase final no hay empate: si el
  // marcador queda igual, los penales de los dos son obligatorios y no pueden quedar igual.
  private validatePenalties(
    match: MatchResponseDto,
    dto: RegisterResultDto,
  ): Penalties {
    const none: Penalties = { home: null, away: null };
    const sent = isGiven(dto.homePenalties) || isGiven(dto.awayPenalties);
    const score = `${dto.homeScore}-${dto.awayScore}`;

    if (match.phase.type === PhaseType.GRUPOS) {
      if (sent) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `Los penales solo se usan en las fases finales: en "${match.phase.name}" el empate vale 1 punto para cada equipo`,
        );
      }
      return none;
    }

    if (dto.homeScore !== dto.awayScore) {
      if (sent) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `Solo hay penales cuando el marcador queda empatado, y quedó ${score}`,
        );
      }
      return none;
    }

    if (!isGiven(dto.homePenalties) || !isGiven(dto.awayPenalties)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `En una fase final como "${match.phase.name}" no hay empate: con el marcador ${score}, registra los penales de los dos equipos`,
      );
    }
    if (dto.homePenalties === dto.awayPenalties) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Los penales no pueden quedar empatados (${dto.homePenalties}-${dto.awayPenalties}): en una fase final siempre hay un ganador`,
      );
    }
    return { home: dto.homePenalties, away: dto.awayPenalties };
  }

  // El marcador oficial de un equipo no puede ser menor a lo que ya suman sus anotaciones.
  private async ensureScoresFit(
    match: MatchResponseDto,
    dto: RegisterResultDto,
  ): Promise<void> {
    const sides = [
      { team: match.homeTeam, score: dto.homeScore },
      { team: match.awayTeam, score: dto.awayScore },
    ];
    for (const { team, score } of sides) {
      const total = await this.scoreTotals.totalForTeam(match.id, team.id);
      if (total > score) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `Las anotaciones de "${team.name}" ya suman ${total}: su marcador no puede ser ${score}. Corrige o elimina anotaciones primero`,
        );
      }
    }
  }
}

function isGiven(value: number | null | undefined): value is number {
  return value !== undefined && value !== null;
}
