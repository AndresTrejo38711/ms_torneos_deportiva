import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { PlayerSummaryDto } from '../players/dto/player-response.dto';
import { toPlayerSummary } from '../players/players.mapper';
import { PlayersService } from '../players/players.service';
import { toSkillSummary } from '../skills/skills.mapper';
import { SkillsService } from '../skills/skills.service';
import {
  CreatePlayerSkillDto,
  DEFAULT_LEVEL,
} from './dto/create-player-skill.dto';
import {
  PlayerSkillResponseDto,
  PlayerSkillSummaryDto,
} from './dto/player-skill-response.dto';
import { UpdatePlayerSkillDto } from './dto/update-player-skill.dto';
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
    if (!skill.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La habilidad "${skill.name}" está desactivada: actívala antes de asignarla a jugadores`,
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
        level: dto.level ?? DEFAULT_LEVEL,
      }),
    );

    return this.findResponse(saved.id);
  }

  // Habilidades de un jugador con el nivel de cada una, ordenadas por nombre.
  async findSkillsByPlayer(playerId: number): Promise<PlayerSkillSummaryDto[]> {
    await this.playersService.findOne(playerId); // 404 si el jugador no existe
    const rows = await this.playerSkillRepository.find({
      where: { player: { id: playerId } },
      relations: { skill: true },
      order: { skill: { name: 'ASC' } },
    });
    return rows.map((row) => ({
      ...toSkillSummary(row.skill),
      level: row.level,
    }));
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

  // Cambiar el nivel de una habilidad que el jugador ya tiene. Se permite aunque el jugador o la
  // habilidad estén desactivados: no es una asignación nueva.
  async updateLevel(
    playerId: number,
    skillId: number,
    dto: UpdatePlayerSkillDto,
  ): Promise<PlayerSkillResponseDto> {
    const playerSkill = await this.findPlayerSkill(playerId, skillId);
    await this.playerSkillRepository.update(playerSkill.id, {
      level: dto.level,
    });
    return this.findResponse(playerSkill.id);
  }

  // Retirar la habilidad del jugador borra solo la fila de player_skills: la habilidad sigue en
  // el catálogo y el jugador sigue registrado. Se permite aunque el jugador esté desactivado.
  async remove(playerId: number, skillId: number): Promise<void> {
    const playerSkill = await this.findPlayerSkill(playerId, skillId);
    await this.playerSkillRepository.delete(playerSkill.id);
  }

  // ---------------------------------------------------------------------------------------------

  // La asignación de esa habilidad a ese jugador. 404 si el jugador o la habilidad no existen, o
  // si el jugador no la tiene.
  private async findPlayerSkill(
    playerId: number,
    skillId: number,
  ): Promise<PlayerSkill> {
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
    return playerSkill;
  }

  private async findResponse(id: number): Promise<PlayerSkillResponseDto> {
    const row = await this.playerSkillRepository.findOneOrFail({
      where: { id },
      relations: { player: true, skill: true },
    });
    return {
      player: toPlayerSummary(row.player),
      skill: toSkillSummary(row.skill),
      level: row.level,
    };
  }
}
