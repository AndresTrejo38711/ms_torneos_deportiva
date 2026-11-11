import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayersModule } from '../players/players.module';
import { SkillsModule } from '../skills/skills.module';
import { PlayerSkill } from './entities/player-skill.entity';
import { PlayerSkillsController } from './player-skills.controller';
import { PlayerSkillsService } from './player-skills.service';

// HU-GD-07. Usa los services que exportan jugadores y habilidades; se exporta el suyo para el
// perfil deportivo (HU-GD-08).
@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerSkill]),
    PlayersModule,
    SkillsModule,
  ],
  controllers: [PlayerSkillsController],
  providers: [PlayerSkillsService],
  exports: [PlayerSkillsService],
})
export class PlayerSkillsModule {}
