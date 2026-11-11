import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './entities/skill.entity';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

// HU-GD-06. Se exporta el service para asignar habilidades a los jugadores (HU-GD-07).
@Module({
  imports: [TypeOrmModule.forFeature([Skill])],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
