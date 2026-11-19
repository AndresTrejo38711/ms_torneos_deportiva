import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { GroupResponseDto } from '../groups/dto/group-response.dto';
import { GroupsService } from '../groups/groups.service';
import { MatchUsageService } from '../matches/match-usage.service';
import { TeamResponseDto } from '../teams/dto/team-response.dto';
import { TeamsService } from '../teams/teams.service';
import { TournamentTeamsService } from '../tournament-teams/tournament-teams.service';
import { CreateGroupTeamsDto } from './dto/create-group-teams.dto';
import { GroupTeam } from './entities/group-team.entity';

// HU-GC-04 · Asignar equipos a los grupos y sacarlos de ellos.
@Injectable()
export class GroupTeamsService {
  // Los services de grupos, equipos e inscripciones llegan porque GroupTeamsModule importa sus
  // módulos: con ellos se valida que existan, con los mismos mensajes de sus HU.
  constructor(
    @InjectRepository(GroupTeam)
    private readonly groupTeamRepository: Repository<GroupTeam>,
    private readonly groupsService: GroupsService,
    private readonly teamsService: TeamsService,
    private readonly tournamentTeamsService: TournamentTeamsService,
    private readonly matchUsage: MatchUsageService,
  ) {}

  // Asigna uno o varios equipos al grupo. Es todo o nada: si uno no cumple, no se asigna ninguno y
  // el mensaje dice cuál y por qué. Responde el grupo con todos sus equipos.
  async create(dto: CreateGroupTeamsDto): Promise<GroupResponseDto> {
    const group = await this.groupsService.findOne(dto.groupId);
    const { tournament } = group;
    if (!tournament.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo "${tournament.name}" está desactivado: actívalo antes de armar sus grupos`,
      );
    }

    const batch = dto.teamIds.length > 1;
    for (const teamId of dto.teamIds) {
      await this.ensureEligible(teamId, group, batch);
    }

    // Un equipo no puede estar dos veces en el mismo grupo, ni en dos grupos de la misma fase.
    const taken = await this.groupTeamRepository.find({
      where: {
        team: { id: In(dto.teamIds) },
        group: { phase: { id: group.phase.id } },
      },
      relations: { team: true, group: true },
      order: { team: { name: 'ASC' } },
    });
    if (taken.length > 0) {
      const reasons = taken
        .map((row) =>
          row.group.id === group.id
            ? `"${row.team.name}" ya está en este grupo`
            : `"${row.team.name}" ya está en el grupo "${row.group.name}" de esta fase`,
        )
        .join('; ');
      throw rejected(ErrorCase.ALREADY_EXISTS, reasons, batch);
    }

    // save() con una lista guarda todas las filas en una sola transacción: o entran todas o ninguna.
    await this.groupTeamRepository.save(
      dto.teamIds.map((teamId) =>
        this.groupTeamRepository.create({
          group: { id: group.id },
          team: { id: teamId },
        }),
      ),
    );

    return this.groupsService.findOne(group.id);
  }

  // Saca al equipo del grupo: borra solo la fila de group_teams; el equipo y el grupo siguen igual.
  // No se permite si el equipo ya tiene partidos en la fase (HU-GC-06): son partidos del grupo.
  async remove(groupId: number, teamId: number): Promise<void> {
    const group = await this.groupsService.findOne(groupId);
    const team = await this.teamsService.findOne(teamId);

    const groupTeam = await this.groupTeamRepository.findOneBy({
      group: { id: groupId },
      team: { id: teamId },
    });
    if (!groupTeam) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `El equipo "${team.name}" no está en el grupo "${group.name}"`,
      );
    }

    const matches = await this.matchUsage.countWithTeamsInPhase(
      group.phase.id,
      [teamId],
    );
    if (matches > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo "${team.name}" ya tiene partidos en "${group.phase.name}" (${matches}): no puede salir del grupo "${group.name}"`,
      );
    }

    await this.groupTeamRepository.delete(groupTeam.id);
  }

  // ---------------------------------------------------------------------------------------------

  // El equipo debe estar registrado (si no, 404), activo e inscrito en el torneo del grupo.
  private async ensureEligible(
    teamId: number,
    group: GroupResponseDto,
    batch: boolean,
  ): Promise<void> {
    let team: TeamResponseDto;
    try {
      team = await this.teamsService.findOne(teamId);
    } catch (error) {
      if (error instanceof ApplicationException) {
        throw rejected(error.errorCase, error.message, batch);
      }
      throw error;
    }

    if (!team.active) {
      throw rejected(
        ErrorCase.INVALID_OPERATION,
        `El equipo "${team.name}" está desactivado: actívalo antes de asignarlo a un grupo`,
        batch,
      );
    }

    const { tournament } = group;
    if (
      !(await this.tournamentTeamsService.isEnrolled(tournament.id, team.id))
    ) {
      throw rejected(
        ErrorCase.INVALID_OPERATION,
        `El equipo "${team.name}" no está inscrito en "${tournament.name}": inscríbelo primero`,
        batch,
      );
    }
  }
}

// Si se asignaban varios equipos, el mensaje aclara que no quedó asignado ninguno.
function rejected(
  errorCase: ErrorCase,
  message: string,
  batch: boolean,
): ApplicationException {
  return new ApplicationException(
    errorCase,
    batch ? `No se asignó ningún equipo. ${message}` : message,
  );
}
