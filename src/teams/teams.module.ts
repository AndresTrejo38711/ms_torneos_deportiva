import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FanTeamUsageModule } from '../fan-teams/fan-team-usage.module';
import { Team } from './entities/team.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

// Todo lo del recurso "equipos". Se exporta el service para las asociaciones con deportes
// (HU-GD-03) y con jugadores (HU-GD-05). FanTeamUsageModule (no depende de nadie) dice si el equipo
// tiene seguidores (HU-GE-05).
@Module({
  imports: [TypeOrmModule.forFeature([Team]), FanTeamUsageModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
