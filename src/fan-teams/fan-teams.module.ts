import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FansModule } from '../fans/fans.module';
import { Team } from '../teams/entities/team.entity';
import { TeamsModule } from '../teams/teams.module';
import { FanTeam } from './entities/fan-team.entity';
import { FanTeamsController } from './fan-teams.controller';
import { FanTeamsService } from './fan-teams.service';

// HU-GE-05 (equipos de interés). Usa los services de aficionados y equipos; la dependencia va en un
// solo sentido: lo que equipos y partidos necesitan de aquí está en FanTeamUsageModule, que no
// depende de nadie. Registra Team solo para listar los equipos disponibles.
@Module({
  imports: [TypeOrmModule.forFeature([FanTeam, Team]), FansModule, TeamsModule],
  controllers: [FanTeamsController],
  providers: [FanTeamsService],
})
export class FanTeamsModule {}
