import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { CreateScoreDto } from './dto/create-score.dto';
import { ScoreResponseDto } from './dto/score-response.dto';
import { UpdateScoreDto } from './dto/update-score.dto';
import { ScoresService } from './scores.service';

// HU-GC-07 · /api/deportiva/scores (anotaciones)
@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Post()
  create(@Body() dto: CreateScoreDto): Promise<ScoreResponseDto> {
    return this.scoresService.create(dto);
  }

  // Anotaciones de un partido, por minuto.
  @Get('matches/:matchId')
  findByMatch(
    @Param('matchId', ParseIdPipe) matchId: number,
  ): Promise<ScoreResponseDto[]> {
    return this.scoresService.findByMatch(matchId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<ScoreResponseDto> {
    return this.scoresService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateScoreDto,
  ): Promise<ScoreResponseDto> {
    return this.scoresService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.scoresService.remove(id);
  }
}
