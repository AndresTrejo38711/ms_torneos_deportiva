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
    });
    const saved = await this.playerRepository.save(player);

    return this.findOne(saved.id);
  }

  // Ordenados por apellidos y luego por nombres.
  async findAll(): Promise<PlayerResponseDto[]> {
    const players = await this.playerRepository.find({
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
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
    player.active = false;
    await this.playerRepository.save(player);
    return toPlayerResponse(player);
  }

  async enable(id: number): Promise<PlayerResponseDto> {
    const player = await this.findPlayer(id);
    if (player.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El jugador ${fullName(player)} ya está activo`,
      );
    }
    player.active = true;
    await this.playerRepository.save(player);
    return toPlayerResponse(player);
  }

  // Antes de eliminar se valida si tiene información asociada: sus contratos con equipos
  // (HU-GD-05). Los contratos son historial y no se borran, así que la salida es desactivarlo.
  // (Sus habilidades, HU-GD-07, se revisarán aquí cuando existan.)
  async remove(id: number): Promise<void> {
    const player = await this.playerRepository.findOne({
      where: { id },
      relations: { teamPlayers: { team: true } },
      order: { teamPlayers: { team: { name: 'ASC' } } },
    });
    if (!player) {
      throw notFound(id);
    }

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

    await this.playerRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  private async findPlayer(id: number): Promise<Player> {
    const player = await this.playerRepository.findOneBy({ id });
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
