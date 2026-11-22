import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { FansService } from '../fans/fans.service';
import { AuthenticatedUser } from '../security/authenticated-user';
import { Team } from '../teams/entities/team.entity';
import { TeamsService } from '../teams/teams.service';
import { CreateFanTeamsDto } from './dto/create-fan-teams.dto';
import {
  AvailableTeamDto,
  FollowedTeamDto,
  TeamFollowerDto,
} from './dto/fan-team-response.dto';
import { FanTeam } from './entities/fan-team.entity';
import {
  FOLLOWED_RELATIONS,
  toAvailableTeam,
  toFollowedTeam,
  toTeamFollower,
} from './fan-teams.mapper';

// HU-GE-05 · Equipos de interés del aficionado. El aficionado sale del token, como en sus métodos de
// pago, apuestas y boletos: solo ve y cambia los suyos. El administrador consulta los aficionados de
// un equipo.
@Injectable()
export class FanTeamsService {
  // TeamsService llega porque este módulo importa el suyo: con él se valida que el equipo exista, con
  // el mismo mensaje de su HU. Team se registra aquí solo para listar los equipos disponibles.
  constructor(
    @InjectRepository(FanTeam)
    private readonly fanTeamRepository: Repository<FanTeam>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    private readonly fansService: FansService,
    private readonly teamsService: TeamsService,
  ) {}

  // Los equipos que el aficionado puede seguir: los activos, por nombre, diciendo cuáles ya sigue
  // (criterio 3).
  async findAvailable(user: AuthenticatedUser): Promise<AvailableTeamDto[]> {
    const fan = await this.fansService.resolve(user);
    const teams = await this.teamRepository.find({
      where: { active: true },
      relations: { teamSports: { sport: true } },
      order: { name: 'ASC' },
    });
    const followed = new Set(
      (
        await this.fanTeamRepository.find({
          where: { fan: { id: fan.id } },
          relations: { team: true },
        })
      ).map((row) => row.team.id),
    );
    return teams.map((team) => toAvailableTeam(team, followed.has(team.id)));
  }

  // Los que sigue, por nombre (criterio 7). Si uno se desactivó, sigue aquí con active en false.
  async findMine(user: AuthenticatedUser): Promise<FollowedTeamDto[]> {
    const fan = await this.fansService.resolve(user);
    const rows = await this.fanTeamRepository.find({
      where: { fan: { id: fan.id } },
      relations: FOLLOWED_RELATIONS,
      order: { team: { name: 'ASC' } },
    });
    return rows.map(toFollowedTeam);
  }

  // Seguir uno o varios equipos (criterios 2, 4 y 6). Es todo o nada: si uno no cumple, no se sigue
  // ninguno y el mensaje dice cuál y por qué.
  async follow(
    user: AuthenticatedUser,
    dto: CreateFanTeamsDto,
  ): Promise<FollowedTeamDto[]> {
    const fan = await this.fansService.resolve(user);
    const batch = dto.teamIds.length > 1;
    for (const teamId of dto.teamIds) {
      const team = await this.teamsService.findOne(teamId); // 404 si no existe
      if (!team.active) {
        throw rejected(
          ErrorCase.INVALID_OPERATION,
          `El equipo "${team.name}" está desactivado: no se puede seguir`,
          batch,
        );
      }
    }

    const already = await this.fanTeamRepository.find({
      where: { fan: { id: fan.id }, team: { id: In(dto.teamIds) } },
      relations: { team: true },
      order: { team: { name: 'ASC' } },
    });
    if (already.length > 0) {
      const names = already.map((row) => `"${row.team.name}"`).join(', ');
      throw rejected(ErrorCase.ALREADY_EXISTS, `Ya sigues a ${names}`, batch);
    }

    // save() con una lista guarda todas las filas en una sola transacción: o entran todas o ninguna.
    let saved: FanTeam[];
    try {
      saved = await this.fanTeamRepository.save(
        dto.teamIds.map((teamId) =>
          this.fanTeamRepository.create({
            fan: { id: fan.id },
            team: { id: teamId },
          }),
        ),
      );
    } catch (error) {
      // Dos peticiones iguales al mismo tiempo: la otra ya lo guardó (uk_fan_team).
      if (error instanceof QueryFailedError) {
        throw rejected(
          ErrorCase.ALREADY_EXISTS,
          'Ya sigues a uno de esos equipos',
          batch,
        );
      }
      throw error;
    }

    const rows = await this.fanTeamRepository.find({
      where: { id: In(saved.map((row) => row.id)) },
      relations: FOLLOWED_RELATIONS,
      order: { team: { name: 'ASC' } },
    });
    return rows.map(toFollowedTeam);
  }

  // Dejar de seguir un equipo (criterio 9): borra solo la relación; el aficionado y el equipo siguen
  // en el sistema (criterio 10).
  async unfollow(user: AuthenticatedUser, teamId: number): Promise<void> {
    const fan = await this.fansService.resolve(user);
    const team = await this.teamsService.findOne(teamId); // 404 si no existe
    const row = await this.fanTeamRepository.findOneBy({
      fan: { id: fan.id },
      team: { id: teamId },
    });
    if (!row) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No sigues a "${team.name}"`,
      );
    }
    await this.fanTeamRepository.delete(row.id);
  }

  // Para el administrador: quienes siguen a un equipo, en el orden en que empezaron a seguirlo
  // (criterio 8).
  async findFollowers(teamId: number): Promise<TeamFollowerDto[]> {
    await this.teamsService.findOne(teamId); // 404 si no existe
    const rows = await this.fanTeamRepository.find({
      where: { team: { id: teamId } },
      relations: { fan: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map(toTeamFollower);
  }
}

// Si se pidieron varios equipos, el mensaje aclara que no se siguió ninguno.
function rejected(
  errorCase: ErrorCase,
  message: string,
  batch: boolean,
): ApplicationException {
  return new ApplicationException(
    errorCase,
    batch ? `No se siguió ningún equipo. ${message}` : message,
  );
}
