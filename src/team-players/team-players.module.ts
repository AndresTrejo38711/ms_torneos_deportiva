import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayersModule } from '../players/players.module';
import { TeamsModule } from '../teams/teams.module';
import { TeamPlayer } from './entities/team-player.entity';
import { TeamPlayersController } from './team-players.controller';
import { TeamPlayersService } from './team-players.service';

// HU-GD-05. Igual que team-sports: usa los services que exportan equipos y jugadores, y la
// dependencia va en un solo sentido. Se exporta el service para el perfil deportivo (HU-GD-08).
@Module({
  imports: [TypeOrmModule.forFeature([TeamPlayer]), TeamsModule, PlayersModule],
  controllers: [TeamPlayersController],
  providers: [TeamPlayersService],
  exports: [TeamPlayersService],
})
export class TeamPlayersModule {}
