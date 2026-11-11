import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { PlayerSummaryDto } from '../players/dto/player-response.dto';
import { SkillResponseDto } from '../skills/dto/skill-response.dto';
import { CreatePlayerSkillDto } from './dto/create-player-skill.dto';
import { PlayerSkillResponseDto } from './dto/player-skill-response.dto';
import { PlayerSkillsService } from './player-skills.service';

// HU-GD-07 · /api/deportiva/player-skills
@Controller('player-skills')
export class PlayerSkillsController {
  constructor(private readonly playerSkillsService: PlayerSkillsService) {}

  // Agregar una habilidad: { "playerId": 1, "skillId": 2 }
  @Post()
  create(@Body() dto: CreatePlayerSkillDto): Promise<PlayerSkillResponseDto> {
    return this.playerSkillsService.create(dto);
  }

  // Habilidades de un jugador.
  @Get('players/:playerId')
  findSkillsByPlayer(
    @Param('playerId', ParseIdPipe) playerId: number,
  ): Promise<SkillResponseDto[]> {
    return this.playerSkillsService.findSkillsByPlayer(playerId);
  }

  // Jugadores que tienen una habilidad.
  @Get('skills/:skillId')
  findPlayersBySkill(
    @Param('skillId', ParseIdPipe) skillId: number,
  ): Promise<PlayerSummaryDto[]> {
    return this.playerSkillsService.findPlayersBySkill(skillId);
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
