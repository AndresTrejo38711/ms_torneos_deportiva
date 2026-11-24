import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { PositionHistoryQueryDto } from './dto/position-history-query.dto';
import { RegisterPositionsDto } from './dto/register-positions.dto';
import { StartTrackingDto } from './dto/start-tracking.dto';
import {
  PositionRecordDto,
  TrackedMatchDto,
  TrackingBoardDto,
} from './dto/tracking-response.dto';
import { TrackingSimulationService } from './simulation/tracking-simulation.service';
import { TrackingService } from './tracking.service';
import { StartSimulationDto } from './dto/simulation.dto';
import { PlayerPhotoDto } from '../players/dto/player-response.dto';

// HU-GC-09 · /api/deportiva/tracking. Consultar (la lista, la pizarra, el historial y las fotos) lo pueden
// el administrador deportivo y el aficionado; iniciar, pausar, finalizar, registrar posiciones y simular el
// partido desde la pizarra, solo el administrador (y el script que simula el partido, con su token).
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly simulation: TrackingSimulationService,
  ) {}

  // Partidos en juego y partidos con seguimiento.
  @Get('matches')
  findMatches(): Promise<TrackedMatchDto[]> {
    return this.trackingService.findMatches();
  }

  // Lo que muestra la pizarra.
  @Get('matches/:matchId')
  board(
    @Param('matchId', ParseIdPipe) matchId: number,
  ): Promise<TrackingBoardDto> {
    return this.trackingService.board(matchId);
  }

  // Historial de posiciones: ?afterId=1250&limit=500
  @Get('matches/:matchId/positions')
  history(
    @Param('matchId', ParseIdPipe) matchId: number,
    @Query() query: PositionHistoryQueryDto,
  ): Promise<PositionRecordDto[]> {
    return this.trackingService.history(matchId, query);
  }

  // Registrar posiciones: { "positions": [{ "playerId": 7, "x": 54, "y": 31 }, { "ball": true, "x": 57, "y": 29 }] }
  @Post('matches/:matchId/positions')
  registerPositions(
    @Param('matchId', ParseIdPipe) matchId: number,
    @Body() dto: RegisterPositionsDto,
  ): Promise<PositionRecordDto[]> {
    return this.trackingService.registerPositions(matchId, dto);
  }

  // Iniciar o reanudar: { "ballName": "Balón oficial" } (opcional, solo la primera vez).
  @Patch('matches/:matchId/start')
  start(
    @Param('matchId', ParseIdPipe) matchId: number,
    @Body() dto: StartTrackingDto,
  ): Promise<TrackingBoardDto> {
    return this.trackingService.start(matchId, dto);
  }

  @Patch('matches/:matchId/pause')
  pause(
    @Param('matchId', ParseIdPipe) matchId: number,
  ): Promise<TrackingBoardDto> {
    return this.trackingService.pause(matchId);
  }

  @Patch('matches/:matchId/finish')
  finish(
    @Param('matchId', ParseIdPipe) matchId: number,
  ): Promise<TrackingBoardDto> {
    return this.trackingService.finish(matchId);
  }

  // Las fotos de los jugadores de la pizarra (solo los que tienen foto). Las ve también el aficionado.
  @Get('matches/:matchId/photos')
  photos(
    @Param('matchId', ParseIdPipe) matchId: number,
  ): Promise<PlayerPhotoDto[]> {
    return this.trackingService.photos(matchId);
  }

  // "Simular partido" (solo el administrador): el servidor mueve a los jugadores y la pelota.
  // { "intervalMs": 1000 } (opcional: 500, 1000 o 2000).
  @Patch('matches/:matchId/simulation/start')
  startSimulation(
    @Param('matchId', ParseIdPipe) matchId: number,
    @Body() dto: StartSimulationDto,
  ): Promise<TrackingBoardDto> {
    return this.simulation.start(matchId, dto);
  }

  @Patch('matches/:matchId/simulation/stop')
  stopSimulation(
    @Param('matchId', ParseIdPipe) matchId: number,
  ): Promise<TrackingBoardDto> {
    return this.simulation.stop(matchId);
  }
}
