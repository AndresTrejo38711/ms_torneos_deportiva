import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FanTeam } from './entities/fan-team.entity';

// Quien sigue a un equipo y a qué equipos (para el correo de partido nuevo).
export interface TeamFollower {
  email: string;
  // Los equipos del partido que sigue, por nombre.
  teams: string[];
}

// Responde preguntas sobre los seguidores de los equipos sin depender de nadie: cuántos tiene un
// equipo y a quién escribirle cuando sus equipos tienen partido nuevo. Lo usan los equipos (no se
// elimina uno con seguidores) y los partidos, de los que FanTeamsModule depende: si fuera parte de
// FanTeamsService habría ciclos (S y D de SOLID), como con BetUsageService y TicketUsageService.
@Injectable()
export class FanTeamUsageService {
  constructor(
    @InjectRepository(FanTeam)
    private readonly fanTeamRepository: Repository<FanTeam>,
  ) {}

  countFollowers(teamId: number): Promise<number> {
    return this.fanTeamRepository.count({ where: { team: { id: teamId } } });
  }

  // Los aficionados que siguen a alguno de estos equipos, una vez cada uno (decisión del Anexo 4: el
  // correo de partido nuevo también les llega a ellos).
  async followersOf(teamIds: number[]): Promise<TeamFollower[]> {
    const rows = await this.fanTeamRepository.find({
      where: { team: { id: In(teamIds) } },
      relations: { fan: true, team: true },
      order: { id: 'ASC' },
    });
    const byEmail = new Map<string, string[]>();
    for (const row of rows) {
      const teams = byEmail.get(row.fan.email) ?? [];
      teams.push(row.team.name);
      byEmail.set(row.fan.email, teams);
    }
    return [...byEmail.entries()].map(([email, teams]) => ({
      email,
      teams: teams.sort((a, b) => a.localeCompare(b, 'es')),
    }));
  }
}
