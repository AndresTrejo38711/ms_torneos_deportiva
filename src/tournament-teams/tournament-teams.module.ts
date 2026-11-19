import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupTeam } from '../group-teams/entities/group-team.entity';
import { TeamsModule } from '../teams/teams.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TournamentTeam } from './entities/tournament-team.entity';
import { TournamentTeamsController } from './tournament-teams.controller';
import { TournamentTeamsService } from './tournament-teams.service';

// HU-GC-02. Importa TournamentsModule y TeamsModule para inyectar los services que ellos exportan.
// La dependencia va en un solo sentido: torneos y equipos no importan este módulo. También registra
// GroupTeam, solo para revisar si un equipo está en un grupo antes de retirar su inscripción.
// Se exporta el service para los grupos (HU-GC-04), que solo admiten equipos inscritos.
@Module({
  imports: [
    TypeOrmModule.forFeature([TournamentTeam, GroupTeam]),
    TournamentsModule,
    TeamsModule,
  ],
  controllers: [TournamentTeamsController],
  providers: [TournamentTeamsService],
  exports: [TournamentTeamsService],
})
export class TournamentTeamsModule {}
