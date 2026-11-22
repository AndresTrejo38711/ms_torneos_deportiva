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
import { TrackingService } from './tracking.service';

// HU-GC-09 · /api/deportiva/tracking. Consultar (la lista, la pizarra y el historial) lo pueden el
// administrador deportivo y el aficionado; iniciar, pausar, finalizar y registrar posiciones, solo
// el administrador (y el script que simula el partido, con su token).
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

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
}
