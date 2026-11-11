import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { SportSummaryDto } from '../sports/dto/sport-response.dto';
import { toSportSummary } from '../sports/sports.mapper';
import { SportsService } from '../sports/sports.service';
import { TeamSummaryDto } from '../teams/dto/team-response.dto';
import { toTeamSummary } from '../teams/teams.mapper';
import { TeamsService } from '../teams/teams.service';
import { CreateTeamSportDto } from './dto/create-team-sport.dto';
import { TeamSportResponseDto } from './dto/team-sport-response.dto';
import { TeamSport } from './entities/team-sport.entity';
import { toTeamSportResponse } from './team-sports.mapper';

// HU-GD-03 · Asociar equipos con deportes.
@Injectable()
export class TeamSportsService {
  // TeamsService y SportsService llegan porque TeamSportsModule importa sus módulos.
  // Con ellos se valida que el equipo y el deporte existan, con los mismos mensajes de sus HU.
  constructor(
    @InjectRepository(TeamSport)
    private readonly teamSportRepository: Repository<TeamSport>,
    private readonly teamsService: TeamsService,
    private readonly sportsService: SportsService,
  ) {}

  async create(dto: CreateTeamSportDto): Promise<TeamSportResponseDto> {
    // Tanto el equipo como el deporte deben existir previamente (si no, 404).
    const team = await this.teamsService.findOne(dto.teamId);
    const sport = await this.sportsService.findOne(dto.sportId);

    // Desactivar es la alternativa a eliminar: algo desactivado no recibe asociaciones nuevas.
    if (!team.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo "${team.name}" está desactivado: actívalo antes de asociarle deportes`,
      );
    }
    if (!sport.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El deporte "${sport.name}" está desactivado: actívalo antes de asociarlo a equipos`,
      );
    }

    // No se permite registrar dos veces la misma asociación.
    // Las relaciones se filtran por el id del objeto relacionado: { team: { id } }.
    const exists = await this.teamSportRepository.existsBy({
      team: { id: team.id },
      sport: { id: sport.id },
    });
    if (exists) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `El equipo "${team.name}" ya está asociado a "${sport.name}"`,
      );
    }

    // Para guardar la relación basta con el id: TypeORM llena team_id y sport_id con él.
    const saved = await this.teamSportRepository.save(
      this.teamSportRepository.create({
        team: { id: team.id },
        sport: { id: sport.id },
      }),
    );

    return toTeamSportResponse(
      await this.teamSportRepository.findOneOrFail({
        where: { id: saved.id },
        relations: { team: true, sport: true },
      }),
    );
  }

  // Deportes en los que participa un equipo, ordenados por nombre.
  async findSportsByTeam(teamId: number): Promise<SportSummaryDto[]> {
    await this.teamsService.findOne(teamId); // 404 si el equipo no existe
    const rows = await this.teamSportRepository.find({
      where: { team: { id: teamId } },
      relations: { sport: true },
      order: { sport: { name: 'ASC' } },
    });
    return rows.map((row) => toSportSummary(row.sport));
  }

  // Equipos que participan en un deporte, ordenados por nombre.
  async findTeamsBySport(sportId: number): Promise<TeamSummaryDto[]> {
    await this.sportsService.findOne(sportId); // 404 si el deporte no existe
    const rows = await this.teamSportRepository.find({
      where: { sport: { id: sportId } },
      relations: { team: true },
      order: { team: { name: 'ASC' } },
    });
    return rows.map((row) => toTeamSummary(row.team));
  }

  // Retirar la asociación borra solo la fila de team_sports: el equipo y el deporte siguen igual.
  // Se permite aunque alguno de los dos esté desactivado.
  async remove(teamId: number, sportId: number): Promise<void> {
    const team = await this.teamsService.findOne(teamId);
    const sport = await this.sportsService.findOne(sportId);

    const teamSport = await this.teamSportRepository.findOneBy({
      team: { id: teamId },
      sport: { id: sportId },
    });
    if (!teamSport) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `El equipo "${team.name}" no está asociado a "${sport.name}"`,
      );
    }

    await this.teamSportRepository.delete(teamSport.id);
  }
}
