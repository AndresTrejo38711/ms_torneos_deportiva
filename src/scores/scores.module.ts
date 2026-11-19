import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { TeamPlayersModule } from '../team-players/team-players.module';
import { Score } from './entities/score.entity';
import { ScoreTotalsModule } from './score-totals.module';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';

// HU-GC-07 (anotaciones). Usa los services que exportan partidos, jugadores y contratos, y la
// dependencia va en un solo sentido: los partidos no importan este módulo, solo ScoreTotalsModule.
// Se exporta el service para el desarrollo del torneo (HU-GC-08), que muestra las anotaciones.
@Module({
  imports: [
    TypeOrmModule.forFeature([Score]),
    MatchesModule,
    PlayersModule,
    TeamPlayersModule,
    ScoreTotalsModule,
  ],
  controllers: [ScoresController],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}
