import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { PhaseType } from '../phases/entities/phase-type.enum';
import { ScoreTotalsService } from '../scores/score-totals.service';
import { MatchResponseDto } from './dto/match-response.dto';
import { RegisterResultDto } from './dto/register-result.dto';
import { MatchStatus } from './entities/match-status.enum';
import { Match } from './entities/match.entity';
import { matchLabel } from './match-label';
import { MatchesService } from './matches.service';

type Penalties = { home: number | null; away: number | null };

// HU-GC-07 · El resultado oficial de un partido. Está aparte de MatchesService (que programa y
// cambia el estado de los partidos) porque es otra HU con sus propias reglas (S de SOLID).
@Injectable()
export class MatchResultsService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly matchesService: MatchesService,
    private readonly scoreTotals: ScoreTotalsService,
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

    await this.matchRepository.update(id, {
      homeScore: dto.homeScore,
      awayScore: dto.awayScore,
      homePenalties: penalties.home,
      awayPenalties: penalties.away,
      status: MatchStatus.FINALIZADO,
    });
    return this.matchesService.findOne(id);
  }

  // ---------------------------------------------------------------------------------------------

  // "Cuando las reglas de la competencia lo permitan": un resultado se corrige mientras ninguna fase
  // posterior del torneo tenga partidos. Si la siguiente ya se armó, cambiarlo podría cambiar quién
  // clasificó.
  private async ensureCorrectable(match: MatchResponseDto): Promise<void> {
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
