import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FanPaymentMethodsModule } from '../fan-payment-methods/fan-payment-methods.module';
import { FansModule } from '../fans/fans.module';
import { Match } from '../matches/entities/match.entity';
import { MatchesModule } from '../matches/matches.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { VenuesModule } from '../venues/venues.module';
import { TicketPrice } from './entities/ticket-price.entity';
import { Ticket } from './entities/ticket.entity';
import {
  MatchTicketingController,
  TicketingMatchesController,
} from './ticket-sales.controller';
import { TicketSalesService } from './ticket-sales.service';
import { TicketUsageModule } from './ticket-usage.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

// HU-GE-04 (venta de entradas). Usa los services de partidos, escenarios, aficionados y métodos de
// pago, y la pasarela de pago; la dependencia va en un solo sentido: ellos no importan este módulo
// (lo que necesitan de los boletos está en TicketUsageModule, que no depende de nadie). Registra Match
// solo para abrir o cerrar su venta, como las cuotas.
@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketPrice, Match]),
    MatchesModule,
    VenuesModule,
    FansModule,
    FanPaymentMethodsModule,
    PaymentsModule,
    NotificationsModule,
    TicketUsageModule,
  ],
  controllers: [
    TicketsController,
    MatchTicketingController,
    TicketingMatchesController,
  ],
  providers: [TicketSalesService, TicketsService],
})
export class TicketsModule {}
