import { Body, Controller, Param, Put } from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { MatchBettingDto } from './dto/match-betting.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { MatchBettingService } from './match-betting.service';

// HU-GC-11 · /api/deportiva/matches/{id}/betting. Las cuotas se consultan con GET /matches/{id}.
@Controller('matches')
export class MatchBettingController {
  constructor(private readonly matchBettingService: MatchBettingService) {}

  // Fija las cuotas y abre o cierra las apuestas.
  @Put(':id/betting')
  configure(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: MatchBettingDto,
  ): Promise<MatchResponseDto> {
    return this.matchBettingService.configure(id, dto);
  }
}
