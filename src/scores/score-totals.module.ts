import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from './entities/score.entity';
import { ScoreTotalsService } from './score-totals.service';

// Solo las sumas de las anotaciones (ver ScoreTotalsService). No importa ningún otro módulo, así
// que lo pueden importar los partidos sin formar un ciclo con las anotaciones.
@Module({
  imports: [TypeOrmModule.forFeature([Score])],
  providers: [ScoreTotalsService],
  exports: [ScoreTotalsService],
})
export class ScoreTotalsModule {}
