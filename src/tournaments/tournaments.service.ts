import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { SportsService } from '../sports/sports.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { TournamentResponseDto } from './dto/tournament-response.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Tournament } from './entities/tournament.entity';
import { toTournamentResponse } from './tournaments.mapper';

// HU-GC-01 · Gestionar torneos.
@Injectable()
export class TournamentsService {
  // SportsService llega porque TournamentsModule importa SportsModule: con él se valida que el
  // deporte exista, con el mismo mensaje de la HU-GD-01.
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    private readonly sportsService: SportsService,
  ) {}

  async create(dto: CreateTournamentDto): Promise<TournamentResponseDto> {
    await this.ensureSportUsable(dto.sportId);
    await this.ensureNameAvailable(dto.name);

    // Para guardar la relación basta con el id: TypeORM llena sport_id con él.
    const tournament = this.tournamentRepository.create({
      name: dto.name,
      sport: { id: dto.sportId },
      category: dto.category,
      startDate: dto.startDate,
      endDate: dto.endDate,
      registrationDeadline: dto.registrationDeadline ?? null,
      logo: dto.logo || null,
    });
    const saved = await this.tournamentRepository.save(tournament);

    return this.findOne(saved.id);
  }

  // Los más recientes primero.
  async findAll(): Promise<TournamentResponseDto[]> {
    const tournaments = await this.summaryQuery()
      .orderBy('tournament.startDate', 'DESC')
      .addOrderBy('tournament.name', 'ASC')
      .getMany();
    return tournaments.map(toTournamentResponse);
  }

  async findOne(id: number): Promise<TournamentResponseDto> {
    return toTournamentResponse(await this.findTournament(id));
  }

  async update(
    id: number,
    dto: UpdateTournamentDto,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.findTournament(id);
    await this.ensureNameAvailable(dto.name, id);

    if (dto.sportId !== tournament.sport.id) {
      // Los equipos inscritos están asociados al deporte actual: cambiarlo los dejaría por fuera.
      const teams = tournament.tournamentTeams.length;
      if (teams > 0) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `No se puede cambiar el deporte de "${tournament.name}" porque ya tiene equipos inscritos (${teams}). Retira las inscripciones primero`,
        );
      }
      await this.ensureSportUsable(dto.sportId);
    }

    // update() y no save(): save() con la relación tournamentTeams cargada intentaría guardarla también.
    await this.tournamentRepository.update(id, {
      name: dto.name,
      sport: { id: dto.sportId },
      category: dto.category,
      startDate: dto.startDate,
      endDate: dto.endDate,
      registrationDeadline: dto.registrationDeadline ?? null,
      logo: dto.logo || null,
    });

    return this.findOne(id);
  }

  async disable(id: number): Promise<TournamentResponseDto> {
    const tournament = await this.findTournament(id);
    if (!tournament.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo "${tournament.name}" ya está desactivado`,
      );
    }
    await this.tournamentRepository.update(id, { active: false });
    return this.findOne(id);
  }

  async enable(id: number): Promise<TournamentResponseDto> {
    const tournament = await this.findTournament(id);
    if (tournament.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo "${tournament.name}" ya está activo`,
      );
    }
    await this.tournamentRepository.update(id, { active: true });
    return this.findOne(id);
  }

  // Antes de eliminar se valida si el torneo tiene información asociada: sus fases (HU-GC-03), que
  // a su vez tienen los grupos y los partidos, y sus equipos inscritos (HU-GC-02).
  async remove(id: number): Promise<void> {
    const tournament = await this.findTournament(id);

    const withPhases = await this.tournamentRepository.findOne({
      where: { id },
      relations: { phases: true },
      order: { phases: { order: 'ASC' } },
    });
    const phases = withPhases?.phases ?? [];
    if (phases.length > 0) {
      const names = phases.map((phase) => phase.name).join(', ');
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${tournament.name}" porque tiene fases (${names}). Elimínalas primero o desactiva el torneo`,
      );
    }

    const teams = tournament.tournamentTeams.length;
    if (teams > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${tournament.name}" porque tiene equipos inscritos (${teams}). Retira las inscripciones primero o desactiva el torneo`,
      );
    }

    await this.tournamentRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  private async findTournament(id: number): Promise<Tournament> {
    const tournament = await this.summaryQuery()
      .where('tournament.id = :id', { id })
      .getOne();
    if (!tournament) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe el torneo con id ${id}`,
      );
    }
    return tournament;
  }

  // Lo que necesita la respuesta: el deporte, las inscripciones (para contar los equipos) y el logo,
  // que no viene por defecto (select: false).
  private summaryQuery() {
    return this.tournamentRepository
      .createQueryBuilder('tournament')
      .addSelect('tournament.logo')
      .innerJoinAndSelect('tournament.sport', 'sport')
      .leftJoinAndSelect('tournament.tournamentTeams', 'tournamentTeam');
  }

  // El deporte debe estar registrado (si no, 404) y activo: un deporte desactivado no recibe
  // torneos nuevos.
  private async ensureSportUsable(sportId: number): Promise<void> {
    const sport = await this.sportsService.findOne(sportId);
    if (!sport.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El deporte "${sport.name}" está desactivado: actívalo antes de crearle torneos`,
      );
    }
  }

  // No se permiten dos torneos con el mismo nombre. Al editar, el nombre puede seguir siendo el suyo.
  private async ensureNameAvailable(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.tournamentRepository.findOneBy({ name });
    if (existing && existing.id !== excludeId) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe un torneo llamado "${existing.name}"`,
      );
    }
  }
}
