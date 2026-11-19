import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { today } from '../common/validation/date.validators';
import { TeamResponseDto } from '../teams/dto/team-response.dto';
import { TeamsService } from '../teams/teams.service';
import { TournamentResponseDto } from '../tournaments/dto/tournament-response.dto';
import { registrationClosedReason } from '../tournaments/tournament-status';
import { TournamentsService } from '../tournaments/tournaments.service';
import { CreateTournamentTeamsDto } from './dto/create-tournament-teams.dto';
import { TournamentTeamResponseDto } from './dto/tournament-team-response.dto';
import { TournamentTeam } from './entities/tournament-team.entity';
import { toTournamentTeamResponse } from './tournament-teams.mapper';

// HU-GC-02 · Gestionar inscripciones de equipos en torneos.
@Injectable()
export class TournamentTeamsService {
  // TournamentsService y TeamsService llegan porque este módulo importa los suyos. Con ellos se
  // valida que el torneo y el equipo existan, con los mismos mensajes de sus HU.
  constructor(
    @InjectRepository(TournamentTeam)
    private readonly tournamentTeamRepository: Repository<TournamentTeam>,
    private readonly tournamentsService: TournamentsService,
    private readonly teamsService: TeamsService,
  ) {}

  // Inscribe uno o varios equipos. Es todo o nada: si uno no cumple, no se inscribe ninguno y el
  // mensaje dice cuál y por qué.
  async create(
    dto: CreateTournamentTeamsDto,
  ): Promise<TournamentTeamResponseDto[]> {
    const tournament = await this.tournamentsService.findOne(dto.tournamentId);

    const closed = registrationClosedReason(tournament);
    if (closed) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `${closed}: ya no se pueden inscribir equipos`,
      );
    }

    const batch = dto.teamIds.length > 1;
    for (const teamId of dto.teamIds) {
      await this.ensureEligible(teamId, tournament, batch);
    }

    // No se permite inscribir dos veces el mismo equipo en el mismo torneo.
    const already = await this.tournamentTeamRepository.find({
      where: {
        tournament: { id: tournament.id },
        team: { id: In(dto.teamIds) },
      },
      relations: { team: true },
      order: { team: { name: 'ASC' } },
    });
    if (already.length > 0) {
      const names = already.map((row) => `"${row.team.name}"`).join(', ');
      const verb =
        already.length === 1 ? 'ya está inscrito' : 'ya están inscritos';
      throw rejected(
        ErrorCase.ALREADY_EXISTS,
        `${names} ${verb} en "${tournament.name}"`,
        batch,
      );
    }

    // save() con una lista guarda todas las filas en una sola transacción: o entran todas o ninguna.
    const saved = await this.tournamentTeamRepository.save(
      dto.teamIds.map((teamId) =>
        this.tournamentTeamRepository.create({
          tournament: { id: tournament.id },
          team: { id: teamId },
          registeredAt: today(),
        }),
      ),
    );

    const rows = await this.tournamentTeamRepository.find({
      where: { id: In(saved.map((row) => row.id)) },
      relations: { tournament: true, team: true },
      order: { team: { name: 'ASC' } },
    });
    return rows.map(toTournamentTeamResponse);
  }

  // Equipos inscritos en un torneo, ordenados por nombre.
  async findByTournament(
    tournamentId: number,
  ): Promise<TournamentTeamResponseDto[]> {
    await this.tournamentsService.findOne(tournamentId); // 404 si el torneo no existe
    const rows = await this.tournamentTeamRepository.find({
      where: { tournament: { id: tournamentId } },
      relations: { tournament: true, team: true },
      order: { team: { name: 'ASC' } },
    });
    return rows.map(toTournamentTeamResponse);
  }

  // Torneos en los que está inscrito un equipo, los más recientes primero.
  async findByTeam(teamId: number): Promise<TournamentTeamResponseDto[]> {
    await this.teamsService.findOne(teamId); // 404 si el equipo no existe
    const rows = await this.tournamentTeamRepository.find({
      where: { team: { id: teamId } },
      relations: { tournament: true, team: true },
      order: { tournament: { startDate: 'DESC', name: 'ASC' } },
    });
    return rows.map(toTournamentTeamResponse);
  }

  // Retirar la inscripción borra solo la fila de tournament_teams: el equipo y el torneo siguen
  // igual. Solo mientras las inscripciones estén abiertas.
  async remove(tournamentId: number, teamId: number): Promise<void> {
    const tournament = await this.tournamentsService.findOne(tournamentId);
    const team = await this.teamsService.findOne(teamId);

    const tournamentTeam = await this.tournamentTeamRepository.findOneBy({
      tournament: { id: tournamentId },
      team: { id: teamId },
    });
    if (!tournamentTeam) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `El equipo "${team.name}" no está inscrito en "${tournament.name}"`,
      );
    }

    const closed = registrationClosedReason(tournament);
    if (closed) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `${closed}: ya no se pueden retirar inscripciones`,
      );
    }

    await this.tournamentTeamRepository.delete(tournamentTeam.id);
  }

  // ---------------------------------------------------------------------------------------------

  // El equipo debe estar registrado (si no, 404), activo y asociado al deporte del torneo.
  private async ensureEligible(
    teamId: number,
    tournament: TournamentResponseDto,
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
        `El equipo "${team.name}" está desactivado: actívalo antes de inscribirlo`,
        batch,
      );
    }

    const { sport } = tournament;
    if (!team.sports.some((teamSport) => teamSport.id === sport.id)) {
      throw rejected(
        ErrorCase.INVALID_OPERATION,
        `El equipo "${team.name}" no está asociado al deporte del torneo (${sport.name}): asócialo primero`,
        batch,
      );
    }
  }
}

// Si se inscribían varios equipos, el mensaje aclara que no quedó inscrito ninguno.
function rejected(
  errorCase: ErrorCase,
  message: string,
  batch: boolean,
): ApplicationException {
  return new ApplicationException(
    errorCase,
    batch ? `No se inscribió ningún equipo. ${message}` : message,
  );
}
