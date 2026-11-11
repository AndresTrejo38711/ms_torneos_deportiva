import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { CreateTeamPlayerDto } from './dto/create-team-player.dto';
import { TeamPlayerResponseDto } from './dto/team-player-response.dto';
import { TeamPlayersService } from './team-players.service';

// HU-GD-05 · /api/deportiva/team-players
// No hay DELETE: retirar cierra el contrato y la fila queda como historial.
@Controller('team-players')
export class TeamPlayersController {
  constructor(private readonly teamPlayersService: TeamPlayersService) {}

  // Asignar: { "teamId": 1, "playerId": 2, "startDate": "2026-01-01", "endDate": "2027-12-31" }
  @Post()
  create(@Body() dto: CreateTeamPlayerDto): Promise<TeamPlayerResponseDto> {
    return this.teamPlayersService.create(dto);
  }

  // Jugadores de un equipo (con su historial).
  @Get('teams/:teamId')
  findByTeam(
    @Param('teamId', ParseIdPipe) teamId: number,
  ): Promise<TeamPlayerResponseDto[]> {
    return this.teamPlayersService.findByTeam(teamId);
  }

  // Equipos de un jugador (historial de traspasos).
  @Get('players/:playerId')
  findByPlayer(
    @Param('playerId', ParseIdPipe) playerId: number,
  ): Promise<TeamPlayerResponseDto[]> {
    return this.teamPlayersService.findByPlayer(playerId);
  }

  // Retirar al jugador del equipo (cierra el contrato con la fecha de hoy).
  @Patch(':id/retire')
  retire(@Param('id', ParseIdPipe) id: number): Promise<TeamPlayerResponseDto> {
    return this.teamPlayersService.retire(id);
  }
}
