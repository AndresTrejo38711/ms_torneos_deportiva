import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayerResponseDto } from './dto/player-response.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { Player } from './entities/player.entity';
import { toPlayerResponse } from './players.mapper';

// HU-GD-04 · Gestionar jugadores.
@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
  ) {}

  async create(dto: CreatePlayerDto): Promise<PlayerResponseDto> {
    await this.ensureDocumentAvailable(dto);

    const player = this.playerRepository.create({
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      birthDate: dto.birthDate,
      position: dto.position || null, // "" también cuenta como sin posición
      nationality: dto.nationality || null,
      heightCm: dto.heightCm ?? null,
      dominantFoot: dto.dominantFoot ?? null,
      photo: dto.photo ?? null,
    });
    const saved = await this.playerRepository.save(player);

    return this.findOne(saved.id);
  }

  // Ordenados por apellidos y luego por nombres. Con `search` (HU-GD-08, buscar un jugador) solo
  // devuelve los que tengan ese texto en su nombre completo ("juan perez" o "perez juan") o en su
  // número de documento. Como la base no distingue tildes ni mayúsculas, "perez" encuentra "Pérez".
  async findAll(search?: string): Promise<PlayerResponseDto[]> {
    // Los contratos y su equipo se traen para armar currentTeams (el equipo actual de cada uno).
    // La foto se pide aparte porque no viene por defecto (select: false en la entidad).
    const query = this.playerRepository
      .createQueryBuilder('player')
      .addSelect('player.photo')
      .leftJoinAndSelect('player.teamPlayers', 'contract')
      .leftJoinAndSelect('contract.team', 'team')
      .orderBy('player.lastName', 'ASC')
      .addOrderBy('player.firstName', 'ASC');

    const text = search?.trim();
    if (text) {
      query.where(
        "(CONCAT(player.firstName, ' ', player.lastName) LIKE :pattern" +
          " OR CONCAT(player.lastName, ' ', player.firstName) LIKE :pattern" +
          ' OR player.documentNumber LIKE :pattern)',
        { pattern: `%${escapeLike(text)}%` },
      );
    }

    const players = await query.getMany();
    return players.map(toPlayerResponse);
  }

  async findOne(id: number): Promise<PlayerResponseDto> {
    return toPlayerResponse(await this.findPlayer(id));
  }

  async update(id: number, dto: UpdatePlayerDto): Promise<PlayerResponseDto> {
    const player = await this.findPlayer(id);
    await this.ensureDocumentAvailable(dto, id);

    player.documentType = dto.documentType;
    player.documentNumber = dto.documentNumber;
    player.firstName = dto.firstName;
    player.lastName = dto.lastName;
    player.birthDate = dto.birthDate;
    player.position = dto.position || null;
    player.nationality = dto.nationality || null;
    player.heightCm = dto.heightCm ?? null;
    player.dominantFoot = dto.dominantFoot ?? null;
    player.photo = dto.photo ?? null;
    await this.playerRepository.save(player);

    return this.findOne(id);
  }

  async disable(id: number): Promise<PlayerResponseDto> {
    const player = await this.findPlayer(id);
    if (!player.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El jugador ${fullName(player)} ya está desactivado`,
      );
    }
    // update() cambia solo esa columna: no vuelve a escribir los demás datos (ni la foto).
    await this.playerRepository.update(id, { active: false });
    return this.findOne(id);
  }

  async enable(id: number): Promise<PlayerResponseDto> {
    const player = await this.findPlayer(id);
    if (player.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El jugador ${fullName(player)} ya está activo`,
      );
    }
    await this.playerRepository.update(id, { active: true });
    return this.findOne(id);
  }

  // Antes de eliminar se valida si tiene información asociada: sus contratos con equipos
  // (HU-GD-05) y sus habilidades (HU-GD-07).
  async remove(id: number): Promise<void> {
    const player = await this.playerRepository.findOne({
      where: { id },
      relations: { teamPlayers: { team: true }, playerSkills: { skill: true } },
      order: {
        teamPlayers: { team: { name: 'ASC' } },
        playerSkills: { skill: { name: 'ASC' } },
      },
    });
    if (!player) {
      throw notFound(id);
    }

    // Los contratos van primero: son historial y no se borran, así que con ellos la única salida
    // es desactivar al jugador.
    if (player.teamPlayers.length > 0) {
      // Un jugador puede tener varios contratos con el mismo equipo: cada nombre va una vez.
      const names = [
        ...new Set(player.teamPlayers.map((row) => row.team.name)),
      ].join(', ');
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar al jugador ${fullName(player)} porque tiene historial de contratos con equipos (${names}). Desactívalo en su lugar`,
      );
    }

    if (player.playerSkills.length > 0) {
      const names = player.playerSkills.map((row) => row.skill.name).join(', ');
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar al jugador ${fullName(player)} porque tiene habilidades asignadas (${names}). Retíraselas primero o desactívalo`,
      );
    }

    await this.playerRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  // Con sus contratos (y el equipo de cada uno) y con la foto, que no viene por defecto.
  private async findPlayer(id: number): Promise<Player> {
    const player = await this.playerRepository
      .createQueryBuilder('player')
      .addSelect('player.photo')
      .leftJoinAndSelect('player.teamPlayers', 'contract')
      .leftJoinAndSelect('contract.team', 'team')
      .where('player.id = :id', { id })
      .getOne();
    if (!player) {
      throw notFound(id);
    }
    return player;
  }

  // No se permiten dos jugadores con el mismo documento (tipo + número).
  // Al editar, el documento puede seguir siendo el suyo.
  private async ensureDocumentAvailable(
    dto: CreatePlayerDto,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.playerRepository.findOneBy({
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
    });
    if (existing && existing.id !== excludeId) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe un jugador con el documento ${existing.documentType} ${existing.documentNumber}: ${fullName(existing)}`,
      );
    }
  }
}

function fullName(player: Player): string {
  return `"${player.firstName} ${player.lastName}"`;
}

function notFound(id: number): ApplicationException {
  return new ApplicationException(
    ErrorCase.NOT_FOUND,
    `No existe el jugador con id ${id}`,
  );
}

// En un LIKE, % y _ son comodines: se escapan para que "10_5" busque ese texto tal cual.
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => '\\' + char);
}
