import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionRecord } from './entities/position-record.entity';
import { TrackingUsageService } from './tracking-usage.service';

// Lo que los partidos necesitan del seguimiento (ver TrackingUsageService). No importa ningún otro
// módulo, así que MatchesModule lo puede importar sin formar un ciclo con TrackingModule.
@Module({
  imports: [TypeOrmModule.forFeature([PositionRecord])],
  providers: [TrackingUsageService],
  exports: [TrackingUsageService],
})
export class TrackingUsageModule {}
