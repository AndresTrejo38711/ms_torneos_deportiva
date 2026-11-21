import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MatchStatus } from './entities/match-status.enum';
import { Match } from './entities/match.entity';

// Responde solo una pregunta: ¿cuántos partidos usan esta fase, este grupo, este equipo o este
// escenario?
//
// La usan las fases, los grupos, las inscripciones y los escenarios para no borrar algo que ya tiene
// partidos.
// Está aparte de MatchesService a propósito: MatchesService depende de esos módulos (valida fases,
// grupos e inscripciones), así que ellos no pueden depender de él sin formar un ciclo. Este service
// no depende de nadie, y cada uno pide solo lo que necesita (S y D de SOLID).
@Injectable()
export class MatchUsageService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
  ) {}

  // Partidos de una fase.
  countInPhase(phaseId: number): Promise<number> {
    return this.matchRepository.count({ where: { phase: { id: phaseId } } });
  }

  // Partidos de una fase en los que juega alguno de estos equipos (por ejemplo, los de un grupo).
  countWithTeamsInPhase(phaseId: number, teamIds: number[]): Promise<number> {
    if (teamIds.length === 0) {
      return Promise.resolve(0);
    }
    return this.matchRepository.count({
      where: [
        { phase: { id: phaseId }, homeTeam: { id: In(teamIds) } },
        { phase: { id: phaseId }, awayTeam: { id: In(teamIds) } },
      ],
    });
  }

  // HU-GE-01: partidos que se juegan (o se jugaron) en un escenario, de cualquier torneo.
  countInVenue(venueId: number): Promise<number> {
    return this.matchRepository.count({ where: { venue: { id: venueId } } });
  }

  // HU-GE-02: partidos de un torneo, programados o en juego, en un escenario. Con sus equipos, para
  // decir cuáles son.
  findPendingInVenue(tournamentId: number, venueId: number): Promise<Match[]> {
    return this.matchRepository.find({
      where: {
        phase: { tournament: { id: tournamentId } },
        venue: { id: venueId },
        status: In([MatchStatus.PROGRAMADO, MatchStatus.EN_JUEGO]),
      },
      relations: { homeTeam: true, awayTeam: true },
      order: { scheduledAt: 'ASC' },
    });
  }

  // Partidos de un equipo en cualquier fase de un torneo.
  countForTeamInTournament(
    tournamentId: number,
    teamId: number,
  ): Promise<number> {
    const phase = { tournament: { id: tournamentId } };
    return this.matchRepository.count({
      where: [
        { phase, homeTeam: { id: teamId } },
        { phase, awayTeam: { id: teamId } },
      ],
    });
  }
}
