import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsModule } from '../groups/groups.module';
import { TeamsModule } from '../teams/teams.module';
import { TournamentTeamsModule } from '../tournament-teams/tournament-teams.module';
import { GroupTeam } from './entities/group-team.entity';
import { GroupTeamsController } from './group-teams.controller';
import { GroupTeamsService } from './group-teams.service';

// HU-GC-04 (equipos de cada grupo). Importa los módulos de grupos, equipos e inscripciones para
// inyectar sus services. Ninguno de ellos importa este módulo.
@Module({
  imports: [
    TypeOrmModule.forFeature([GroupTeam]),
    GroupsModule,
    TeamsModule,
    TournamentTeamsModule,
  ],
  controllers: [GroupTeamsController],
  providers: [GroupTeamsService],
})
export class GroupTeamsModule {}
