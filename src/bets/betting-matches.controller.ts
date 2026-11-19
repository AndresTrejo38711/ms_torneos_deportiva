import { Controller, Get } from '@nestjs/common';
import { MatchResponseDto } from '../matches/dto/match-response.dto';
import { BetsService } from './bets.service';

// HU-GC-11 · /api/deportiva/betting/matches: los partidos que hoy reciben apuestas, con sus cuotas.
// Va en otra ruta y no en /bets/... para que su permiso no se cruce con el de ver una apuesta
// (/bets/{id}).
@Controller('betting')
export class BettingMatchesController {
  constructor(private readonly betsService: BetsService) {}

  @Get('matches')
  availableMatches(): Promise<MatchResponseDto[]> {
    return this.betsService.availableMatches();
  }
}
