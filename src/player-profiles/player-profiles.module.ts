import { Module } from '@nestjs/common';
import { PlayerSkillsModule } from '../player-skills/player-skills.module';
import { PlayersModule } from '../players/players.module';
import { TeamPlayersModule } from '../team-players/team-players.module';
import { PlayerProfilesController } from './player-profiles.controller';
import { PlayerProfilesService } from './player-profiles.service';

// HU-GD-08. Sin TypeOrmModule.forFeature: no tiene tablas propias.
@Module({
  imports: [PlayersModule, TeamPlayersModule, PlayerSkillsModule],
  controllers: [PlayerProfilesController],
  providers: [PlayerProfilesService],
})
export class PlayerProfilesModule {}
