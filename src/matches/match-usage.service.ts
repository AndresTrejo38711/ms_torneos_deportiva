import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Match } from './entities/match.entity';

// Responde solo una pregunta: ¿cuántos partidos usan esta fase, este grupo o este equipo?
//
// La usan las fases, los grupos y las inscripciones para no borrar algo que ya tiene partidos.
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
