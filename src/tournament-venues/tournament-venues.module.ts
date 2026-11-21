import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchUsageModule } from '../matches/match-usage.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { VenuesModule } from '../venues/venues.module';
import { TournamentVenue } from './entities/tournament-venue.entity';
import { TournamentVenuesController } from './tournament-venues.controller';
import { TournamentVenuesService } from './tournament-venues.service';

// HU-GE-02. Importa TournamentsModule y VenuesModule para validar el torneo y el escenario, y
// MatchUsageModule para no retirar un escenario con partidos pendientes. La dependencia va en un solo
// sentido: torneos y escenarios no importan este módulo. Se exporta el service para los partidos
// (HU-GC-06), que solo se juegan en un escenario del torneo.
@Module({
  imports: [
    TypeOrmModule.forFeature([TournamentVenue]),
    TournamentsModule,
    VenuesModule,
    MatchUsageModule,
  ],
  controllers: [TournamentVenuesController],
  providers: [TournamentVenuesService],
  exports: [TournamentVenuesService],
})
export class TournamentVenuesModule {}
