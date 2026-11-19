import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchUsageModule } from '../matches/match-usage.module';
import { PhasesModule } from '../phases/phases.module';
import { Group } from './entities/group.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

// HU-GC-04. Importa PhasesModule para validar la fase de cada grupo. Se exporta el service para
// asignar equipos a los grupos (group-teams).
@Module({
  imports: [TypeOrmModule.forFeature([Group]), PhasesModule, MatchUsageModule],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
