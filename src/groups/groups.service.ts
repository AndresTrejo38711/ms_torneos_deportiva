import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { PhaseType } from '../phases/entities/phase-type.enum';
import { PhasesService } from '../phases/phases.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './entities/group.entity';
import { toGroupResponse } from './groups.mapper';

// HU-GC-04 · Gestionar grupos de competencia. Los equipos de cada grupo se asignan en
// group-teams; aquí se crean, consultan, renombran y eliminan los grupos.
@Injectable()
export class GroupsService {
  // PhasesService llega porque GroupsModule importa PhasesModule: con él se valida que la fase
  // exista y sea de grupos, con el mismo mensaje de la HU-GC-03.
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    private readonly phasesService: PhasesService,
  ) {}

  async create(dto: CreateGroupDto): Promise<GroupResponseDto> {
    const phase = await this.phasesService.findOne(dto.phaseId);
    if (phase.type !== PhaseType.GRUPOS) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${phase.name}" es una fase final: solo las fases de grupos tienen grupos`,
      );
    }
    if (!phase.tournament.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo "${phase.tournament.name}" está desactivado: actívalo antes de agregarle grupos`,
      );
    }
    await this.ensureNameAvailable(phase.id, phase.name, dto.name);

    // Para guardar la relación basta con el id: TypeORM llena phase_id con él.
    const saved = await this.groupRepository.save(
      this.groupRepository.create({ phase: { id: phase.id }, name: dto.name }),
    );

    return this.findOne(saved.id);
  }

  // Grupos de una fase, ordenados por nombre, cada uno con sus equipos. Una fase final no tiene
  // grupos: su lista llega vacía.
  async findByPhase(phaseId: number): Promise<GroupResponseDto[]> {
    await this.phasesService.findOne(phaseId); // 404 si la fase no existe
    const groups = await this.summaryQuery()
      .where('phase.id = :phaseId', { phaseId })
      .orderBy('grp.name', 'ASC')
      .getMany();
    return groups.map(toGroupResponse);
  }

  async findOne(id: number): Promise<GroupResponseDto> {
    return toGroupResponse(await this.findGroup(id));
  }

  async update(id: number, dto: UpdateGroupDto): Promise<GroupResponseDto> {
    const group = await this.findGroup(id);
    await this.ensureNameAvailable(
      group.phase.id,
      group.phase.name,
      dto.name,
      id,
    );
    await this.groupRepository.update(id, { name: dto.name });
    return this.findOne(id);
  }

  // Eliminar un grupo saca a sus equipos del grupo (la base borra sus filas de group_teams), pero
  // los equipos siguen registrados en la plataforma. Los partidos del grupo se suman a esta
  // validación cuando existan (HU-GC-06).
  async remove(id: number): Promise<void> {
    await this.findGroup(id); // 404 si el grupo no existe
    await this.groupRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  private async findGroup(id: number): Promise<Group> {
    const group = await this.summaryQuery()
      .where('grp.id = :id', { id })
      .getOne();
    if (!group) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe el grupo con id ${id}`,
      );
    }
    return group;
  }

  // Lo que necesita la respuesta: la fase con su torneo y los equipos del grupo.
  // El alias es "grp" porque GROUP es palabra de SQL.
  private summaryQuery() {
    return this.groupRepository
      .createQueryBuilder('grp')
      .innerJoinAndSelect('grp.phase', 'phase')
      .innerJoinAndSelect('phase.tournament', 'tournament')
      .leftJoinAndSelect('grp.groupTeams', 'groupTeam')
      .leftJoinAndSelect('groupTeam.team', 'team');
  }

  // Una fase no puede tener dos grupos con el mismo nombre. Al editar, puede seguir siendo el suyo.
  private async ensureNameAvailable(
    phaseId: number,
    phaseName: string,
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.groupRepository.findOneBy({
      phase: { id: phaseId },
      name,
    });
    if (existing && existing.id !== excludeId) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `La fase "${phaseName}" ya tiene un grupo llamado "${existing.name}"`,
      );
    }
  }
}
