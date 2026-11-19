import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { MatchesModule } from '../matches/matches.module';
import { PhasesModule } from '../phases/phases.module';
import { ScoresModule } from '../scores/scores.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TournamentDevelopmentController } from './tournament-development.controller';
import { TournamentDevelopmentService } from './tournament-development.service';

// HU-GC-08. Solo lee, con los services que exportan torneos, fases, grupos, partidos y anotaciones.
// No tiene entidades propias. Va aparte del módulo de torneos porque depende de partidos y
// anotaciones, que a su vez dependen de torneos: dentro de TournamentsModule formaría un ciclo.
@Module({
  imports: [
    TournamentsModule,
    PhasesModule,
    GroupsModule,
    MatchesModule,
    ScoresModule,
  ],
  controllers: [TournamentDevelopmentController],
  providers: [TournamentDevelopmentService],
})
export class TournamentDevelopmentModule {}
