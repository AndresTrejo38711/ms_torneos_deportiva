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
import { SportSummaryDto } from '../sports/dto/sport-response.dto';
import { TeamSummaryDto } from '../teams/dto/team-response.dto';
import { CreateTeamSportDto } from './dto/create-team-sport.dto';
import { TeamSportResponseDto } from './dto/team-sport-response.dto';
import { TeamSportsService } from './team-sports.service';

// HU-GD-03 · /api/deportiva/team-sports
@Controller('team-sports')
export class TeamSportsController {
  constructor(private readonly teamSportsService: TeamSportsService) {}

  // Asociar: { "teamId": 1, "sportId": 2 }
  @Post()
  create(@Body() dto: CreateTeamSportDto): Promise<TeamSportResponseDto> {
    return this.teamSportsService.create(dto);
  }

  // Deportes de un equipo.
  @Get('teams/:teamId')
  findSportsByTeam(
    @Param('teamId', ParseIdPipe) teamId: number,
  ): Promise<SportSummaryDto[]> {
    return this.teamSportsService.findSportsByTeam(teamId);
  }

  // Equipos de un deporte.
  @Get('sports/:sportId')
  findTeamsBySport(
    @Param('sportId', ParseIdPipe) sportId: number,
  ): Promise<TeamSummaryDto[]> {
    return this.teamSportsService.findTeamsBySport(sportId);
  }

  // Retirar la asociación (el equipo y el deporte no se eliminan).
  @Delete(':teamId/:sportId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('teamId', ParseIdPipe) teamId: number,
    @Param('sportId', ParseIdPipe) sportId: number,
  ): Promise<void> {
    return this.teamSportsService.remove(teamId, sportId);
  }
}
