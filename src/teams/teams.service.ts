import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from './entities/team.entity';
import { toTeamResponse } from './teams.mapper';

// HU-GD-02 · Gestionar equipos.
@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async create(dto: CreateTeamDto): Promise<TeamResponseDto> {
    await this.ensureNameAvailable(dto.name);

    const team = this.teamRepository.create({
      name: dto.name,
      city: dto.city,
      foundationDate: dto.foundationDate ?? null,
    });
    const saved = await this.teamRepository.save(team);

    return this.findOne(saved.id);
  }

  async findAll(): Promise<TeamResponseDto[]> {
    const teams = await this.teamRepository.find({ order: { name: 'ASC' } });
    return teams.map(toTeamResponse);
  }

  async findOne(id: number): Promise<TeamResponseDto> {
    return toTeamResponse(await this.findTeam(id));
  }

  async update(id: number, dto: UpdateTeamDto): Promise<TeamResponseDto> {
    const team = await this.findTeam(id);
    await this.ensureNameAvailable(dto.name, id);

    team.name = dto.name;
    team.city = dto.city;
    team.foundationDate = dto.foundationDate ?? null;
    await this.teamRepository.save(team);

    return this.findOne(id);
  }

  async disable(id: number): Promise<TeamResponseDto> {
    const team = await this.findTeam(id);
    if (!team.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo "${team.name}" ya está desactivado`,
      );
    }
    team.active = false;
    await this.teamRepository.save(team);
    return toTeamResponse(team);
  }

  async enable(id: number): Promise<TeamResponseDto> {
    const team = await this.findTeam(id);
    if (team.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo "${team.name}" ya está activo`,
      );
    }
    team.active = true;
    await this.teamRepository.save(team);
    return toTeamResponse(team);
  }

  // Antes de eliminar se valida si el equipo tiene información asociada. Hoy todavía no puede
  // tenerla: sus deportes (HU-GD-03) y sus jugadores (HU-GD-05) se revisarán aquí cuando existan.
  async remove(id: number): Promise<void> {
    await this.findTeam(id);
    await this.teamRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  private async findTeam(id: number): Promise<Team> {
    const team = await this.teamRepository.findOneBy({ id });
    if (!team) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe el equipo con id ${id}`,
      );
    }
    return team;
  }

  // No se permiten dos equipos con el mismo nombre. Al editar, el nombre puede seguir siendo el suyo.
  private async ensureNameAvailable(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.teamRepository.findOneBy({ name });
    if (existing && existing.id !== excludeId) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe un equipo llamado "${existing.name}"`,
      );
    }
  }
}
