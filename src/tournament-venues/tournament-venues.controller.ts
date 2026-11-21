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
import { CreateTournamentVenuesDto } from './dto/create-tournament-venues.dto';
import { TournamentVenueResponseDto } from './dto/tournament-venue-response.dto';
import { TournamentVenuesService } from './tournament-venues.service';

// HU-GE-02 · /api/deportiva/tournament-venues
@Controller('tournament-venues')
export class TournamentVenuesController {
  constructor(
    private readonly tournamentVenuesService: TournamentVenuesService,
  ) {}

  // Asignar uno o varios escenarios: { "tournamentId": 1, "venueIds": [3, 4] }
  @Post()
  create(
    @Body() dto: CreateTournamentVenuesDto,
  ): Promise<TournamentVenueResponseDto[]> {
    return this.tournamentVenuesService.create(dto);
  }

  // Escenarios asignados a un torneo.
  @Get('tournaments/:tournamentId')
  findByTournament(
    @Param('tournamentId', ParseIdPipe) tournamentId: number,
  ): Promise<TournamentVenueResponseDto[]> {
    return this.tournamentVenuesService.findByTournament(tournamentId);
  }

  // Torneos a los que está asignado un escenario.
  @Get('venues/:venueId')
  findByVenue(
    @Param('venueId', ParseIdPipe) venueId: number,
  ): Promise<TournamentVenueResponseDto[]> {
    return this.tournamentVenuesService.findByVenue(venueId);
  }

  // Retirar la asignación (el escenario y el torneo no se eliminan).
  @Delete(':tournamentId/:venueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('tournamentId', ParseIdPipe) tournamentId: number,
    @Param('venueId', ParseIdPipe) venueId: number,
  ): Promise<void> {
    return this.tournamentVenuesService.remove(tournamentId, venueId);
  }
}
