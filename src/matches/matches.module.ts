import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsModule } from '../groups/groups.module';
import { PhasesModule } from '../phases/phases.module';
import { TeamsModule } from '../teams/teams.module';
import { TournamentTeamsModule } from '../tournament-teams/tournament-teams.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { Match } from './entities/match.entity';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

// HU-GC-06. Importa los módulos de fases, torneos, grupos, equipos e inscripciones para validar
// cada partido. Ninguno de ellos importa este módulo: los que necesitan saber si algo tiene partidos
// usan MatchUsageModule.
@Module({
  imports: [
    TypeOrmModule.forFeature([Match]),
    PhasesModule,
    TournamentsModule,
    GroupsModule,
    TeamsModule,
    TournamentTeamsModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
