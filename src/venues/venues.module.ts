import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchUsageModule } from '../matches/match-usage.module';
import { Venue } from './entities/venue.entity';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

// Escenarios deportivos (HU-GE-01). MatchUsageModule (que no depende de nadie) dice si un escenario
// tiene partidos. Se exporta el service para las localidades (HU-GE-03), los escenarios del torneo
// (HU-GE-02) y los partidos, que validan su escenario con él.
@Module({
  imports: [TypeOrmModule.forFeature([Venue]), MatchUsageModule],
  controllers: [VenuesController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
