import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MatchesService } from './matches.service';

// HU-GC-06 · /api/deportiva/matches
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  create(@Body() dto: CreateMatchDto): Promise<MatchResponseDto> {
    return this.matchesService.create(dto);
  }

  // Partidos de una fase, por fecha.
  @Get('phases/:phaseId')
  findByPhase(
    @Param('phaseId', ParseIdPipe) phaseId: number,
  ): Promise<MatchResponseDto[]> {
    return this.matchesService.findByPhase(phaseId);
  }

  // Partidos de un torneo (todas sus fases), por fecha.
  @Get('tournaments/:tournamentId')
  findByTournament(
    @Param('tournamentId', ParseIdPipe) tournamentId: number,
  ): Promise<MatchResponseDto[]> {
    return this.matchesService.findByTournament(tournamentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<MatchResponseDto> {
    return this.matchesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateMatchDto,
  ): Promise<MatchResponseDto> {
    return this.matchesService.update(id, dto);
  }

  @Patch(':id/start')
  start(@Param('id', ParseIdPipe) id: number): Promise<MatchResponseDto> {
    return this.matchesService.start(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseIdPipe) id: number): Promise<MatchResponseDto> {
    return this.matchesService.cancel(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.matchesService.remove(id);
  }
}
