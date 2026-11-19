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
import { CreateTournamentTeamsDto } from './dto/create-tournament-teams.dto';
import { TournamentTeamResponseDto } from './dto/tournament-team-response.dto';
import { TournamentTeamsService } from './tournament-teams.service';

// HU-GC-02 · /api/deportiva/tournament-teams
@Controller('tournament-teams')
export class TournamentTeamsController {
  constructor(
    private readonly tournamentTeamsService: TournamentTeamsService,
  ) {}

  // Inscribir uno o varios equipos: { "tournamentId": 1, "teamIds": [3, 5, 8] }
  @Post()
  create(
    @Body() dto: CreateTournamentTeamsDto,
  ): Promise<TournamentTeamResponseDto[]> {
    return this.tournamentTeamsService.create(dto);
  }

  // Equipos inscritos en un torneo.
  @Get('tournaments/:tournamentId')
  findByTournament(
    @Param('tournamentId', ParseIdPipe) tournamentId: number,
  ): Promise<TournamentTeamResponseDto[]> {
    return this.tournamentTeamsService.findByTournament(tournamentId);
  }

  // Torneos en los que está inscrito un equipo.
  @Get('teams/:teamId')
  findByTeam(
    @Param('teamId', ParseIdPipe) teamId: number,
  ): Promise<TournamentTeamResponseDto[]> {
    return this.tournamentTeamsService.findByTeam(teamId);
  }

  // Retirar la inscripción (el equipo y el torneo no se eliminan).
  @Delete(':tournamentId/:teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('tournamentId', ParseIdPipe) tournamentId: number,
    @Param('teamId', ParseIdPipe) teamId: number,
  ): Promise<void> {
    return this.tournamentTeamsService.remove(tournamentId, teamId);
  }
}
