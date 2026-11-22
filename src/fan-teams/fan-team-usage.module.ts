import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FanTeam } from './entities/fan-team.entity';
import { FanTeamUsageService } from './fan-team-usage.service';

// Lo que los equipos y los partidos necesitan de los equipos de interés (ver FanTeamUsageService).
// No importa ningún otro módulo, así que ellos lo pueden importar sin formar un ciclo con
// FanTeamsModule (que sí depende de equipos).
@Module({
  imports: [TypeOrmModule.forFeature([FanTeam])],
  providers: [FanTeamUsageService],
  exports: [FanTeamUsageService],
})
export class FanTeamUsageModule {}
