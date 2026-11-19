import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Score } from './entities/score.entity';

// Responde solo cuánto suman las anotaciones: de un partido, de un equipo en un partido o de
// varios partidos a la vez.
//
// Está aparte de ScoresService a propósito, como MatchUsageService: ScoresService depende de los
// partidos (valida el partido de cada anotación), y los partidos necesitan estas sumas para su
// marcador en vivo y su resultado. Este service no depende de nadie, así que no se forma un ciclo
// (S y D de SOLID).
@Injectable()
export class ScoreTotalsService {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
  ) {}

  // Cuántas anotaciones tiene un partido.
  countInMatch(matchId: number): Promise<number> {
    return this.scoreRepository.count({ where: { match: { id: matchId } } });
  }

  // Lo que suman las anotaciones de un equipo en un partido. excludeId es la anotación que se está
  // editando: su valor viejo no cuenta.
  async totalForTeam(
    matchId: number,
    teamId: number,
    excludeId?: number,
  ): Promise<number> {
    const total = await this.scoreRepository.sum('points', {
      match: { id: matchId },
      team: { id: teamId },
      ...(excludeId === undefined ? {} : { id: Not(excludeId) }),
    });
    return Number(total ?? 0);
  }

  // Lo que suma cada equipo en cada partido, en una sola consulta: partido → equipo → total.
  // Un equipo sin anotaciones no aparece (suma 0).
  async totalsByMatch(
    matchIds: number[],
  ): Promise<Map<number, Map<number, number>>> {
    const totals = new Map<number, Map<number, number>>();
    if (matchIds.length === 0) {
      return totals;
    }
    const rows = await this.scoreRepository
      .createQueryBuilder('score')
      .select('score.match_id', 'matchId')
      .addSelect('score.team_id', 'teamId')
      .addSelect('SUM(score.points)', 'total')
      .where('score.match_id IN (:...matchIds)', { matchIds })
      .groupBy('score.match_id')
      .addGroupBy('score.team_id')
      .getRawMany<{ matchId: number; teamId: number; total: string }>();

    for (const row of rows) {
      const matchId = Number(row.matchId);
      const byTeam = totals.get(matchId) ?? new Map<number, number>();
      byTeam.set(Number(row.teamId), Number(row.total));
      totals.set(matchId, byTeam);
    }
    return totals;
  }
}
