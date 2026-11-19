import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FanPaymentMethodsModule } from '../fan-payment-methods/fan-payment-methods.module';
import { FansModule } from '../fans/fans.module';
import { MatchesModule } from '../matches/matches.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BetsController } from './bets.controller';
import { BetsService } from './bets.service';
import { BettingMatchesController } from './betting-matches.controller';
import { Bet } from './entities/bet.entity';

// HU-GC-11 (apuestas). Usa los services de partidos, aficionados y métodos de pago, y la
// dependencia va en un solo sentido: ellos no importan este módulo (lo que necesitan de las
// apuestas está en BetSettlementModule, que no depende de nadie).
@Module({
  imports: [
    TypeOrmModule.forFeature([Bet]),
    MatchesModule,
    FansModule,
    FanPaymentMethodsModule,
    NotificationsModule,
  ],
  controllers: [BetsController, BettingMatchesController],
  providers: [BetsService],
})
export class BetsModule {}
