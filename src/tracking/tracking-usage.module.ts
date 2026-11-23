import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../matches/entities/match.entity';
import { PositionRecord } from './entities/position-record.entity';
import { TrackingEvents } from './tracking-events';
import { TrackingUsageService } from './tracking-usage.service';

// Lo que los partidos necesitan del seguimiento (ver TrackingUsageService) y los avisos en vivo
// (TrackingEvents). No importa ningún otro módulo, así que MatchesModule lo puede importar sin formar
// un ciclo con TrackingModule. TrackingModule también lo importa: los dos comparten la misma
// instancia de TrackingEvents, y por ella el gateway se entera de todo.
@Module({
  imports: [TypeOrmModule.forFeature([PositionRecord, Match])],
  providers: [TrackingUsageService, TrackingEvents],
  exports: [TrackingUsageService, TrackingEvents],
})
export class TrackingUsageModule {}
