import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { PlayerSummaryDto } from '../players/dto/player-response.dto';
import { toPlayerSummary } from '../players/players.mapper';
import { PlayersService } from '../players/players.service';
import { SkillResponseDto } from '../skills/dto/skill-response.dto';
import { toSkillResponse } from '../skills/skills.mapper';
import { SkillsService } from '../skills/skills.service';
import { CreatePlayerSkillDto } from './dto/create-player-skill.dto';
import { PlayerSkillResponseDto } from './dto/player-skill-response.dto';
import { PlayerSkill } from './entities/player-skill.entity';

// HU-GD-07 · Asignar habilidades a jugadores.
@Injectable()
export class PlayerSkillsService {
  constructor(
    @InjectRepository(PlayerSkill)
    private readonly playerSkillRepository: Repository<PlayerSkill>,
    private readonly playersService: PlayersService,
    private readonly skillsService: SkillsService,
  ) {}

  async create(dto: CreatePlayerSkillDto): Promise<PlayerSkillResponseDto> {
    // Tanto el jugador como la habilidad deben existir previamente (si no, 404).
    const player = await this.playersService.findOne(dto.playerId);
    const skill = await this.skillsService.findOne(dto.skillId);
    const playerName = `"${player.firstName} ${player.lastName}"`;

    if (!player.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El jugador ${playerName} está desactivado: actívalo antes de asignarle habilidades`,
      );
    }

    // No se puede asignar dos veces la misma habilidad al mismo jugador.
    const exists = await this.playerSkillRepository.existsBy({
      player: { id: player.id },
      skill: { id: skill.id },
    });
    if (exists) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `El jugador ${playerName} ya tiene la habilidad "${skill.name}"`,
      );
    }

    const saved = await this.playerSkillRepository.save(
      this.playerSkillRepository.create({
        player: { id: player.id },
        skill: { id: skill.id },
      }),
    );

    const row = await this.playerSkillRepository.findOneOrFail({
      where: { id: saved.id },
      relations: { player: true, skill: true },
    });
    return {
      player: toPlayerSummary(row.player),
      skill: toSkillResponse(row.skill),
    };
  }

  // Habilidades de un jugador, ordenadas por nombre.
  async findSkillsByPlayer(playerId: number): Promise<SkillResponseDto[]> {
    await this.playersService.findOne(playerId); // 404 si el jugador no existe
    const rows = await this.playerSkillRepository.find({
      where: { player: { id: playerId } },
      relations: { skill: true },
      order: { skill: { name: 'ASC' } },
    });
    return rows.map((row) => toSkillResponse(row.skill));
  }

  // Jugadores que tienen una habilidad, ordenados por apellidos y nombres.
  async findPlayersBySkill(skillId: number): Promise<PlayerSummaryDto[]> {
    await this.skillsService.findOne(skillId); // 404 si la habilidad no existe
    const rows = await this.playerSkillRepository.find({
      where: { skill: { id: skillId } },
      relations: { player: true },
      order: { player: { lastName: 'ASC', firstName: 'ASC' } },
    });
    return rows.map((row) => toPlayerSummary(row.player));
  }

  // Retirar la habilidad del jugador borra solo la fila de player_skills: la habilidad sigue en
  // el catálogo y el jugador sigue registrado. Se permite aunque el jugador esté desactivado.
  async remove(playerId: number, skillId: number): Promise<void> {
    const player = await this.playersService.findOne(playerId);
    const skill = await this.skillsService.findOne(skillId);

    const playerSkill = await this.playerSkillRepository.findOneBy({
      player: { id: playerId },
      skill: { id: skillId },
    });
    if (!playerSkill) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `El jugador "${player.firstName} ${player.lastName}" no tiene la habilidad "${skill.name}"`,
      );
    }

    await this.playerSkillRepository.delete(playerSkill.id);
  }
}
