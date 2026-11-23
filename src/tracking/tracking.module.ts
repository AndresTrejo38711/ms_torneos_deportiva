import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../matches/entities/match.entity';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { SecurityModule } from '../security/security.module';
import { TeamPlayersModule } from '../team-players/team-players.module';
import { Ball } from './entities/ball.entity';
import { PositionRecord } from './entities/position-record.entity';
import { TrackingController } from './tracking.controller';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { TrackingUsageModule } from './tracking-usage.module';

// HU-GC-09 (seguimiento deportivo del partido). Usa los services de partidos, contratos y jugadores;
// ninguno de ellos importa este módulo: lo que los partidos necesitan de aquí está en
// TrackingUsageModule, que no depende de nadie. Registra Match para leer y cambiar las columnas del
// seguimiento, que viven en el partido. TrackingGateway es el socket de las pizarras (etapa 2): toma
// los avisos de TrackingEvents (de TrackingUsageModule) y valida con SecurityClient quién se une.
@Module({
  imports: [
    TypeOrmModule.forFeature([Ball, PositionRecord, Match]),
    MatchesModule,
    TeamPlayersModule,
    PlayersModule,
    TrackingUsageModule,
    SecurityModule,
  ],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingGateway],
})
export class TrackingModule {}
