import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { PlayerSummaryDto } from '../players/dto/player-response.dto';
import { CreatePlayerSkillDto } from './dto/create-player-skill.dto';
import {
  PlayerSkillResponseDto,
  PlayerSkillSummaryDto,
} from './dto/player-skill-response.dto';
import { UpdatePlayerSkillDto } from './dto/update-player-skill.dto';
import { PlayerSkillsService } from './player-skills.service';

// HU-GD-07 · /api/deportiva/player-skills
@Controller('player-skills')
export class PlayerSkillsController {
  constructor(private readonly playerSkillsService: PlayerSkillsService) {}

  // Agregar una habilidad: { "playerId": 1, "skillId": 2 } o, con nivel, { ..., "level": 84 }
  @Post()
  create(@Body() dto: CreatePlayerSkillDto): Promise<PlayerSkillResponseDto> {
    return this.playerSkillsService.create(dto);
  }

  // Habilidades de un jugador, cada una con su nivel.
  @Get('players/:playerId')
  findSkillsByPlayer(
    @Param('playerId', ParseIdPipe) playerId: number,
  ): Promise<PlayerSkillSummaryDto[]> {
    return this.playerSkillsService.findSkillsByPlayer(playerId);
  }

  // Jugadores que tienen una habilidad.
  @Get('skills/:skillId')
  findPlayersBySkill(
    @Param('skillId', ParseIdPipe) skillId: number,
  ): Promise<PlayerSummaryDto[]> {
    return this.playerSkillsService.findPlayersBySkill(skillId);
  }

  // Cambiar el nivel que el jugador tiene en una habilidad: { "level": 90 }
  @Patch(':playerId/:skillId')
  updateLevel(
    @Param('playerId', ParseIdPipe) playerId: number,
    @Param('skillId', ParseIdPipe) skillId: number,
    @Body() dto: UpdatePlayerSkillDto,
  ): Promise<PlayerSkillResponseDto> {
    return this.playerSkillsService.updateLevel(playerId, skillId, dto);
  }

  // Retirar la habilidad del jugador (la habilidad no se elimina del sistema).
  @Delete(':playerId/:skillId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('playerId', ParseIdPipe) playerId: number,
    @Param('skillId', ParseIdPipe) skillId: number,
  ): Promise<void> {
    return this.playerSkillsService.remove(playerId, skillId);
  }
}
