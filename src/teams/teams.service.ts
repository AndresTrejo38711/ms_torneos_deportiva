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
      shortName: dto.shortName || null, // "" también cuenta como sin nombre corto
      city: dto.city,
      description: dto.description || null,
      foundationDate: dto.foundationDate ?? null,
    });
    const saved = await this.teamRepository.save(team);

    return this.findOne(saved.id);
  }

  async findAll(): Promise<TeamResponseDto[]> {
    const teams = await this.teamRepository.find({
      relations: SUMMARY_RELATIONS,
      order: { name: 'ASC' },
    });
    return teams.map(toTeamResponse);
  }

  async findOne(id: number): Promise<TeamResponseDto> {
    return toTeamResponse(await this.findTeam(id));
  }

  async update(id: number, dto: UpdateTeamDto): Promise<TeamResponseDto> {
    const team = await this.findTeam(id);
    await this.ensureNameAvailable(dto.name, id);

    team.name = dto.name;
    team.shortName = dto.shortName || null;
    team.city = dto.city;
    team.description = dto.description || null;
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
    return this.findOne(id);
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
    return this.findOne(id);
  }

  // Antes de eliminar se valida si el equipo tiene información asociada: sus contratos con
  // jugadores (HU-GD-05) y sus deportes (HU-GD-03).
  async remove(id: number): Promise<void> {
    // teamSports: { sport: true } carga las filas de team_sports y, de cada una, su deporte.
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: { teamSports: { sport: true }, teamPlayers: true },
      order: { teamSports: { sport: { name: 'ASC' } } },
    });
    if (!team) {
      throw notFound(id);
    }

    // Los contratos se revisan primero: son historial y no se borran, así que con ellos la única
    // salida es desactivar el equipo. Se dice cuántos hay, porque una plantilla puede ser larga.
    const contracts = team.teamPlayers.length;
    if (contracts > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${team.name}" porque tiene historial de contratos con jugadores (${contracts} ${contracts === 1 ? 'contrato' : 'contratos'}). Desactívalo en su lugar`,
      );
    }

    if (team.teamSports.length > 0) {
      const names = team.teamSports.map((row) => row.sport.name).join(', ');
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${team.name}" porque está asociado a deportes (${names}). Retira esas asociaciones primero o desactiva el equipo`,
      );
    }

    await this.teamRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  private async findTeam(id: number): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: SUMMARY_RELATIONS,
    });
    if (!team) {
      throw notFound(id);
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

// Lo que necesita el resumen de la respuesta: los deportes del equipo y sus contratos con el
// jugador de cada uno (para contar los jugadores actuales).
const SUMMARY_RELATIONS = {
  teamSports: { sport: true },
  teamPlayers: { player: true },
} as const;

function notFound(id: number): ApplicationException {
  return new ApplicationException(
    ErrorCase.NOT_FOUND,
    `No existe el equipo con id ${id}`,
  );
}
