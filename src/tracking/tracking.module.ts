import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../matches/entities/match.entity';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { TeamPlayersModule } from '../team-players/team-players.module';
import { Ball } from './entities/ball.entity';
import { PositionRecord } from './entities/position-record.entity';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

// HU-GC-09 (seguimiento deportivo del partido). Usa los services de partidos, contratos y jugadores;
// ninguno de ellos importa este módulo: lo que los partidos necesitan de aquí está en
// TrackingUsageModule, que no depende de nadie. Registra Match para leer y cambiar las columnas del
// seguimiento, que viven en el partido.
@Module({
  imports: [
    TypeOrmModule.forFeature([Ball, PositionRecord, Match]),
    MatchesModule,
    TeamPlayersModule,
    PlayersModule,
  ],
  controllers: [TrackingController],
  providers: [TrackingService],
})
export class TrackingModule {}
