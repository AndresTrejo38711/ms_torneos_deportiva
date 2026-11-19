import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { FinalPhase } from './entities/final-phase.entity';
import { GroupPhase } from './entities/group-phase.entity';
import { Phase } from './entities/phase.entity';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';

// HU-GC-03 y HU-GC-05. Registra la clase abstracta y sus dos hijas (las tres usan la tabla phases).
// Importa TournamentsModule para validar el torneo; se exporta el service para los grupos (HU-GC-04).
@Module({
  imports: [
    TypeOrmModule.forFeature([Phase, GroupPhase, FinalPhase]),
    TournamentsModule,
  ],
  controllers: [PhasesController],
  providers: [PhasesService],
  exports: [PhasesService],
})
export class PhasesModule {}
