import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { MatchUsageService } from '../matches/match-usage.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { DEFAULT_QUALIFIERS_PER_GROUP } from './dto/phase-fields.dto';
import { PhaseResponseDto } from './dto/phase-response.dto';
import { ReorderPhasesDto } from './dto/reorder-phases.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { FinalPhase } from './entities/final-phase.entity';
import { GroupPhase } from './entities/group-phase.entity';
import { Phase } from './entities/phase.entity';
import { PhaseType } from './entities/phase-type.enum';
import {
  isFinalPhase,
  isGroupPhase,
  phaseTypeLabel,
  phaseTypeOf,
} from './phase-kind';
import { toPhaseResponse } from './phases.mapper';

// HU-GC-03 (fases de un torneo) y HU-GC-05 (fases finales). Las dos clases hijas se manejan aquí
// porque comparten el torneo, el nombre y el orden; lo propio de cada una está en su entidad.
@Injectable()
export class PhasesService {
  // TournamentsService llega porque PhasesModule importa TournamentsModule: con él se valida que el
  // torneo exista, con el mismo mensaje de la HU-GC-01.
  constructor(
    @InjectRepository(Phase)
    private readonly phaseRepository: Repository<Phase>,
    private readonly tournamentsService: TournamentsService,
    private readonly matchUsage: MatchUsageService,
  ) {}

  // La fase nueva queda de última en el orden del torneo.
  async create(dto: CreatePhaseDto): Promise<PhaseResponseDto> {
    const tournament = await this.tournamentsService.findOne(dto.tournamentId);
    if (!tournament.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo "${tournament.name}" está desactivado: actívalo antes de agregarle fases`,
      );
    }
    await this.ensureNameAvailable(tournament.id, tournament.name, dto.name);

    const last = await this.phaseRepository
      .createQueryBuilder('phase')
      .select('MAX(phase.order)', 'max')
      .where('phase.tournament_id = :tournamentId', {
        tournamentId: tournament.id,
      })
      .getRawOne<{ max: number | null }>();
    const order = Number(last?.max ?? 0) + 1;

    // Se crea la clase hija que corresponde: TypeORM llena la columna "type" según la clase.
    const { manager } = this.phaseRepository;
    const common = { tournament: { id: tournament.id }, name: dto.name, order };
    const phase =
      dto.type === PhaseType.GRUPOS
        ? manager.create(GroupPhase, {
            ...common,
            qualifiersPerGroup:
              dto.qualifiersPerGroup ?? DEFAULT_QUALIFIERS_PER_GROUP,
          })
        : manager.create(FinalPhase, {
            ...common,
            teamsCount: Number(dto.teamsCount),
          });
    const saved = await manager.save(phase);

    return this.findOne(saved.id);
  }

  // Fases de un torneo, en el orden en que se juegan.
  async findByTournament(tournamentId: number): Promise<PhaseResponseDto[]> {
    await this.tournamentsService.findOne(tournamentId); // 404 si el torneo no existe
    const phases = await this.summaryQuery()
      .where('tournament.id = :tournamentId', { tournamentId })
      .orderBy('phase.order', 'ASC')
      .getMany();
    return phases.map(toPhaseResponse);
  }

  async findOne(id: number): Promise<PhaseResponseDto> {
    return toPhaseResponse(await this.findPhase(id));
  }

  // El tipo llega para validar los campos que le corresponden, pero no se puede cambiar.
  async update(id: number, dto: UpdatePhaseDto): Promise<PhaseResponseDto> {
    const phase = await this.findPhase(id);
    const type = phaseTypeOf(phase);
    if (dto.type !== type) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${phase.name}" es una ${phaseTypeLabel(type)} y su tipo no se puede cambiar: elimínala y créala de nuevo como ${phaseTypeLabel(dto.type)}`,
      );
    }
    await this.ensureNameAvailable(
      phase.tournament.id,
      phase.tournament.name,
      dto.name,
      id,
    );

    // update() y no save(): save() con la relación groups cargada intentaría guardarla también.
    const { manager } = this.phaseRepository;
    if (isGroupPhase(phase)) {
      await manager.update(GroupPhase, id, {
        name: dto.name,
        qualifiersPerGroup:
          dto.qualifiersPerGroup ?? DEFAULT_QUALIFIERS_PER_GROUP,
      });
    } else {
      // HU-GC-05: con partidos, la llave ya está armada para ese número de equipos.
      const teamsCount = Number(dto.teamsCount);
      if (isFinalPhase(phase) && teamsCount !== phase.teamsCount) {
        const matches = await this.matchUsage.countInPhase(id);
        if (matches > 0) {
          throw new ApplicationException(
            ErrorCase.INVALID_OPERATION,
            `No se puede cambiar el número de equipos de "${phase.name}" porque ya tiene partidos (${matches}). Elimínalos primero`,
          );
        }
      }
      await manager.update(FinalPhase, id, {
        name: dto.name,
        teamsCount: Number(dto.teamsCount),
      });
    }

    return this.findOne(id);
  }

  // Cambia el orden de todas las fases del torneo a la vez: la lista debe traerlas todas, cada una
  // una vez, en el orden nuevo.
  async reorder(
    tournamentId: number,
    dto: ReorderPhasesDto,
  ): Promise<PhaseResponseDto[]> {
    const tournament = await this.tournamentsService.findOne(tournamentId);
    const phases = await this.phaseRepository.find({
      where: { tournament: { id: tournamentId } },
      order: { order: 'ASC' },
    });

    const ids = new Set(phases.map((phase) => phase.id));
    const foreign = dto.phaseIds.filter((phaseId) => !ids.has(phaseId));
    if (foreign.length > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Estas fases no son del torneo "${tournament.name}": ${foreign.join(', ')}`,
      );
    }
    const missing = phases.filter((phase) => !dto.phaseIds.includes(phase.id));
    if (missing.length > 0) {
      const names = missing.map((phase) => `"${phase.name}"`).join(', ');
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Faltan fases del torneo en la lista (${names}): envíalas todas, en el orden nuevo`,
      );
    }

    // En una transacción: o quedan todas con su orden nuevo o ninguna cambia.
    await this.phaseRepository.manager.transaction(async (manager) => {
      for (const [index, phaseId] of dto.phaseIds.entries()) {
        await manager.update(Phase, phaseId, { order: index + 1 });
      }
    });

    return this.findByTournament(tournamentId);
  }

  // Solo se elimina si no tiene información asociada: sus partidos (HU-GC-06) y sus grupos
  // (HU-GC-04). El torneo y las demás fases no se eliminan: solo se corre el orden de las que iban
  // después, para no dejar huecos.
  async remove(id: number): Promise<void> {
    const phase = await this.findPhase(id);

    const matches = await this.matchUsage.countInPhase(id);
    if (matches > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${phase.name}" porque tiene partidos (${matches}). Elimínalos primero`,
      );
    }

    if (isGroupPhase(phase) && phase.groups.length > 0) {
      const names = phase.groups
        .map((group) => group.name)
        .sort((a, b) => a.localeCompare(b, 'es'))
        .join(', ');
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${phase.name}" porque tiene grupos (${names}). Elimínalos primero`,
      );
    }

    await this.phaseRepository.manager.transaction(async (manager) => {
      await manager.delete(Phase, id);
      const rest = await manager.find(Phase, {
        where: { tournament: { id: phase.tournament.id } },
        order: { order: 'ASC' },
      });
      for (const [index, other] of rest.entries()) {
        if (other.order !== index + 1) {
          await manager.update(Phase, other.id, { order: index + 1 });
        }
      }
    });
  }

  // ---------------------------------------------------------------------------------------------

  private async findPhase(id: number): Promise<Phase> {
    const phase = await this.summaryQuery()
      .where('phase.id = :id', { id })
      .getOne();
    if (!phase) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe la fase con id ${id}`,
      );
    }
    return phase;
  }

  // Lo que necesita la respuesta: el torneo y, en las fases de grupos, sus grupos (para contarlos).
  // TypeORM entrega cada fila como GroupPhase o FinalPhase según su columna "type".
  private summaryQuery() {
    return this.phaseRepository
      .createQueryBuilder('phase')
      .innerJoinAndSelect('phase.tournament', 'tournament')
      .leftJoinAndSelect('phase.groups', 'grp');
  }

  // Un torneo no puede tener dos fases con el mismo nombre. Al editar, puede seguir siendo el suyo.
  private async ensureNameAvailable(
    tournamentId: number,
    tournamentName: string,
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.phaseRepository.findOneBy({
      tournament: { id: tournamentId },
      name,
    });
    if (existing && existing.id !== excludeId) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `El torneo "${tournamentName}" ya tiene una fase llamada "${existing.name}"`,
      );
    }
  }
}
