import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { matchLabel } from '../matches/match-label';
import { MatchUsageService } from '../matches/match-usage.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { VenueResponseDto } from '../venues/dto/venue-response.dto';
import { VenuesService } from '../venues/venues.service';
import { CreateTournamentVenuesDto } from './dto/create-tournament-venues.dto';
import { TournamentVenueResponseDto } from './dto/tournament-venue-response.dto';
import { TournamentVenue } from './entities/tournament-venue.entity';
import { toTournamentVenueResponse } from './tournament-venues.mapper';

// HU-GE-02 · Asignar escenarios a torneos.
@Injectable()
export class TournamentVenuesService {
  // TournamentsService y VenuesService llegan porque este módulo importa los suyos: con ellos se
  // valida que el torneo y el escenario existan, con los mismos mensajes de sus HU. MatchUsageService
  // dice si el escenario tiene partidos pendientes del torneo (no depende de nadie: no hay ciclos).
  constructor(
    @InjectRepository(TournamentVenue)
    private readonly tournamentVenueRepository: Repository<TournamentVenue>,
    private readonly tournamentsService: TournamentsService,
    private readonly venuesService: VenuesService,
    private readonly matchUsage: MatchUsageService,
  ) {}

  // Asigna uno o varios escenarios. Es todo o nada: si uno no cumple, no se asigna ninguno y el
  // mensaje dice cuál y por qué.
  async create(
    dto: CreateTournamentVenuesDto,
  ): Promise<TournamentVenueResponseDto[]> {
    const tournament = await this.tournamentsService.findOne(dto.tournamentId);
    if (!tournament.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo "${tournament.name}" está desactivado: actívalo antes de asignarle escenarios`,
      );
    }

    const batch = dto.venueIds.length > 1;
    for (const venueId of dto.venueIds) {
      await this.ensureUsable(venueId, batch);
    }

    // No se permite asignar dos veces el mismo escenario al mismo torneo.
    const already = await this.tournamentVenueRepository.find({
      where: {
        tournament: { id: tournament.id },
        venue: { id: In(dto.venueIds) },
      },
      relations: { venue: true },
      order: { venue: { name: 'ASC' } },
    });
    if (already.length > 0) {
      const names = already.map((row) => `"${row.venue.name}"`).join(', ');
      const verb =
        already.length === 1 ? 'ya está asignado' : 'ya están asignados';
      throw rejected(
        ErrorCase.ALREADY_EXISTS,
        `${names} ${verb} a "${tournament.name}"`,
        batch,
      );
    }

    // save() con una lista guarda todas las filas en una sola transacción: o entran todas o ninguna.
    const saved = await this.tournamentVenueRepository.save(
      dto.venueIds.map((venueId) =>
        this.tournamentVenueRepository.create({
          tournament: { id: tournament.id },
          venue: { id: venueId },
        }),
      ),
    );

    return this.findRows({ id: In(saved.map((row) => row.id)) });
  }

  // Escenarios asignados a un torneo, ordenados por nombre.
  async findByTournament(
    tournamentId: number,
  ): Promise<TournamentVenueResponseDto[]> {
    await this.tournamentsService.findOne(tournamentId); // 404 si el torneo no existe
    return this.findRows({ tournament: { id: tournamentId } });
  }

  // Torneos a los que está asignado un escenario, los más recientes primero.
  async findByVenue(venueId: number): Promise<TournamentVenueResponseDto[]> {
    await this.venuesService.findOne(venueId); // 404 si el escenario no existe
    const rows = await this.tournamentVenueRepository.find({
      where: { venue: { id: venueId } },
      relations: { tournament: true, venue: { parent: true } },
      order: { tournament: { startDate: 'DESC', name: 'ASC' } },
    });
    return rows.map(toTournamentVenueResponse);
  }

  // Lo usan los partidos (HU-GC-06, criterio 11): un partido solo se juega en un escenario del torneo.
  isAssigned(tournamentId: number, venueId: number): Promise<boolean> {
    return this.tournamentVenueRepository.existsBy({
      tournament: { id: tournamentId },
      venue: { id: venueId },
    });
  }

  // Retirar la asignación borra solo la fila de tournament_venues: el escenario y el torneo siguen
  // igual. No se permite si el torneo tiene partidos programados o en juego en ese escenario; los ya
  // jugados (o cancelados) conservan su escenario como historial.
  async remove(tournamentId: number, venueId: number): Promise<void> {
    const tournament = await this.tournamentsService.findOne(tournamentId);
    const venue = await this.venuesService.findOne(venueId);

    const tournamentVenue = await this.tournamentVenueRepository.findOneBy({
      tournament: { id: tournamentId },
      venue: { id: venueId },
    });
    if (!tournamentVenue) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `El escenario "${venue.name}" no está asignado a "${tournament.name}"`,
      );
    }

    const pending = await this.matchUsage.findPendingInVenue(
      tournamentId,
      venueId,
    );
    if (pending.length > 0) {
      const labels = pending.map(matchLabel).join(', ');
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${tournament.name}" tiene partidos programados en "${venue.name}" (${labels}): cámbialos de escenario o cancélalos antes de retirarlo`,
      );
    }

    await this.tournamentVenueRepository.delete(tournamentVenue.id);
  }

  // ---------------------------------------------------------------------------------------------

  // Filas con el torneo y el escenario (y el que lo contiene, para su ubicación), por nombre del
  // escenario.
  private async findRows(
    where: FindOptionsWhere<TournamentVenue>,
  ): Promise<TournamentVenueResponseDto[]> {
    const rows = await this.tournamentVenueRepository.find({
      where,
      relations: { tournament: true, venue: { parent: true } },
      order: { venue: { name: 'ASC' } },
    });
    return rows.map(toTournamentVenueResponse);
  }

  // El escenario debe estar registrado (si no, 404) y se debe poder usar: activo y, si está dentro de
  // otro, ese también activo.
  private async ensureUsable(venueId: number, batch: boolean): Promise<void> {
    let venue: VenueResponseDto;
    try {
      venue = await this.venuesService.findOne(venueId);
    } catch (error) {
      if (error instanceof ApplicationException) {
        throw rejected(error.errorCase, error.message, batch);
      }
      throw error;
    }
    if (!venue.available) {
      const reason =
        venue.active && venue.parent
          ? `El escenario "${venue.name}" está dentro de "${venue.parent.name}", que está desactivado`
          : `El escenario "${venue.name}" está desactivado`;
      throw rejected(
        ErrorCase.INVALID_OPERATION,
        `${reason}: actívalo antes de asignarlo`,
        batch,
      );
    }
  }
}

// Si se asignaban varios escenarios, el mensaje aclara que no quedó asignado ninguno.
function rejected(
  errorCase: ErrorCase,
  message: string,
  batch: boolean,
): ApplicationException {
  return new ApplicationException(
    errorCase,
    batch ? `No se asignó ningún escenario. ${message}` : message,
  );
}
