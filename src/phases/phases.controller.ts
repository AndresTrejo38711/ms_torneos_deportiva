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
import { CreatePhaseDto } from './dto/create-phase.dto';
import { PhaseResponseDto } from './dto/phase-response.dto';
import { ReorderPhasesDto } from './dto/reorder-phases.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { PhasesService } from './phases.service';

// HU-GC-03 y HU-GC-05 · /api/deportiva/phases (las fases de grupos y las finales usan las mismas
// rutas; el campo "type" dice cuál es cuál).
@Controller('phases')
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Post()
  create(@Body() dto: CreatePhaseDto): Promise<PhaseResponseDto> {
    return this.phasesService.create(dto);
  }

  // Fases de un torneo, en orden.
  @Get('tournaments/:tournamentId')
  findByTournament(
    @Param('tournamentId', ParseIdPipe) tournamentId: number,
  ): Promise<PhaseResponseDto[]> {
    return this.phasesService.findByTournament(tournamentId);
  }

  // Reordenar: { "phaseIds": [3, 1, 2] }
  @Put('tournaments/:tournamentId/order')
  reorder(
    @Param('tournamentId', ParseIdPipe) tournamentId: number,
    @Body() dto: ReorderPhasesDto,
  ): Promise<PhaseResponseDto[]> {
    return this.phasesService.reorder(tournamentId, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<PhaseResponseDto> {
    return this.phasesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdatePhaseDto,
  ): Promise<PhaseResponseDto> {
    return this.phasesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.phasesService.remove(id);
  }
}
