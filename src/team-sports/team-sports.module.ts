import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportsModule } from '../sports/sports.module';
import { TeamsModule } from '../teams/teams.module';
import { TeamSport } from './entities/team-sport.entity';
import { TeamSportsController } from './team-sports.controller';
import { TeamSportsService } from './team-sports.service';

// HU-GD-03. Importa TeamsModule y SportsModule para poder inyectar los services que ellos
// exportan. La dependencia va en un solo sentido: equipos y deportes no importan este módulo.
@Module({
  imports: [TypeOrmModule.forFeature([TeamSport]), TeamsModule, SportsModule],
  controllers: [TeamSportsController],
  providers: [TeamSportsService],
})
export class TeamSportsModule {}
