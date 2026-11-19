import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportsModule } from '../sports/sports.module';
import { Tournament } from './entities/tournament.entity';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

// HU-GC-01. Importa SportsModule para validar el deporte de cada torneo. Se exporta el service
// para las inscripciones (HU-GC-02).
@Module({
  imports: [TypeOrmModule.forFeature([Tournament]), SportsModule],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
