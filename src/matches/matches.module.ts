import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsModule } from '../groups/groups.module';
import { PhasesModule } from '../phases/phases.module';
import { ScoreTotalsModule } from '../scores/score-totals.module';
import { TeamsModule } from '../teams/teams.module';
import { TournamentTeamsModule } from '../tournament-teams/tournament-teams.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { Match } from './entities/match.entity';
import { MatchResultsController } from './match-results.controller';
import { MatchResultsService } from './match-results.service';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

// HU-GC-06 (partidos) y HU-GC-07 (su resultado oficial). Importa los módulos de fases, torneos,
// grupos, equipos e inscripciones para validar cada partido. Ninguno de ellos importa este módulo:
// los que necesitan saber si algo tiene partidos usan MatchUsageModule. Las sumas de las anotaciones
// llegan de ScoreTotalsModule, que no depende de nadie.
//
// Se exporta MatchesService para las anotaciones (HU-GC-07), que validan el partido con él.
@Module({
  imports: [
    TypeOrmModule.forFeature([Match]),
    PhasesModule,
    TournamentsModule,
    GroupsModule,
    TeamsModule,
    TournamentTeamsModule,
    ScoreTotalsModule,
  ],
  controllers: [MatchesController, MatchResultsController],
  providers: [MatchesService, MatchResultsService],
  exports: [MatchesService],
})
export class MatchesModule {}
