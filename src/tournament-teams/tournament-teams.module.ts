import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsModule } from '../teams/teams.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TournamentTeam } from './entities/tournament-team.entity';
import { TournamentTeamsController } from './tournament-teams.controller';
import { TournamentTeamsService } from './tournament-teams.service';

// HU-GC-02. Importa TournamentsModule y TeamsModule para inyectar los services que ellos exportan.
// La dependencia va en un solo sentido: torneos y equipos no importan este módulo.
@Module({
  imports: [
    TypeOrmModule.forFeature([TournamentTeam]),
    TournamentsModule,
    TeamsModule,
  ],
  controllers: [TournamentTeamsController],
  providers: [TournamentTeamsService],
})
export class TournamentTeamsModule {}
