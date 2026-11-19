import { Controller, Get, Param } from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { TournamentDevelopmentDto } from './dto/tournament-development.dto';
import { TournamentDevelopmentService } from './tournament-development.service';

// HU-GC-08 · /api/deportiva/tournaments/{id}/development
@Controller('tournaments')
export class TournamentDevelopmentController {
  constructor(
    private readonly tournamentDevelopmentService: TournamentDevelopmentService,
  ) {}

  // Información general, resumen, fases con sus tablas o llaves, y partidos con sus anotaciones.
  @Get(':id/development')
  findOne(
    @Param('id', ParseIdPipe) id: number,
  ): Promise<TournamentDevelopmentDto> {
    return this.tournamentDevelopmentService.findOne(id);
  }
}
