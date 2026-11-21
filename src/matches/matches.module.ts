import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetSettlementModule } from '../bets/bet-settlement.module';
import { GroupsModule } from '../groups/groups.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PhasesModule } from '../phases/phases.module';
import { ScoreTotalsModule } from '../scores/score-totals.module';
import { TeamsModule } from '../teams/teams.module';
import { TicketUsageModule } from '../tickets/ticket-usage.module';
import { TournamentTeamsModule } from '../tournament-teams/tournament-teams.module';
import { TournamentVenuesModule } from '../tournament-venues/tournament-venues.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { VenuesModule } from '../venues/venues.module';
import { Match } from './entities/match.entity';
import { MatchBettingController } from './match-betting.controller';
import { MatchBettingService } from './match-betting.service';
import { MatchResultsController } from './match-results.controller';
import { MatchResultsService } from './match-results.service';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

// HU-GC-06 (partidos) y HU-GC-07 (su resultado oficial). Importa los módulos de fases, torneos,
// grupos, equipos e inscripciones para validar cada partido. Ninguno de ellos importa este módulo:
// los que necesitan saber si algo tiene partidos usan MatchUsageModule. Las sumas de las anotaciones
// llegan de ScoreTotalsModule, y lo de las apuestas (liquidar, anular, contar) de BetSettlementModule:
// ninguno de los dos depende de nadie. Las cuotas (HU-GC-11) también se fijan aquí. VenuesModule y
// TournamentVenuesModule (Anexo 4) validan el escenario del partido; tampoco importan este módulo.
// TicketUsageModule (no depende de nadie) dice qué boletos tiene y los anula al cancelarlo (HU-GE-04).
//
// Se exporta MatchesService para las anotaciones (HU-GC-07) y las apuestas (HU-GC-11), que validan
// el partido con él.
@Module({
  imports: [
    TypeOrmModule.forFeature([Match]),
    PhasesModule,
    TournamentsModule,
    GroupsModule,
    TeamsModule,
    TournamentTeamsModule,
    ScoreTotalsModule,
    BetSettlementModule,
    NotificationsModule,
    VenuesModule,
    TournamentVenuesModule,
    TicketUsageModule,
  ],
  controllers: [
    MatchesController,
    MatchResultsController,
    MatchBettingController,
  ],
  providers: [MatchesService, MatchResultsService, MatchBettingService],
  exports: [MatchesService],
})
export class MatchesModule {}
