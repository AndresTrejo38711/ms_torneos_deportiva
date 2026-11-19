import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { MatchUsageService } from './match-usage.service';

// Solo la consulta "¿esto ya tiene partidos?" (ver MatchUsageService). No importa ningún otro
// módulo, así que lo pueden importar las fases, los grupos y las inscripciones sin formar ciclos.
@Module({
  imports: [TypeOrmModule.forFeature([Match])],
  providers: [MatchUsageService],
  exports: [MatchUsageService],
})
export class MatchUsageModule {}
