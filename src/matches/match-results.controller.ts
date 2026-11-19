import { Body, Controller, Param, Put } from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { MatchResponseDto } from './dto/match-response.dto';
import { RegisterResultDto } from './dto/register-result.dto';
import { MatchResultsService } from './match-results.service';

// HU-GC-07 · /api/deportiva/matches/{id}/result. El resultado se consulta con GET /matches/{id}.
@Controller('matches')
export class MatchResultsController {
  constructor(private readonly matchResultsService: MatchResultsService) {}

  // Registra el resultado oficial (el partido queda FINALIZADO) o lo corrige.
  @Put(':id/result')
  register(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: RegisterResultDto,
  ): Promise<MatchResponseDto> {
    return this.matchResultsService.register(id, dto);
  }
}
