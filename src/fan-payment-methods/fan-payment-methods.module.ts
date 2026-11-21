import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetSettlementModule } from '../bets/bet-settlement.module';
import { FansModule } from '../fans/fans.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { TicketUsageModule } from '../tickets/ticket-usage.module';
import { FanPaymentMethod } from './entities/fan-payment-method.entity';
import { FanPaymentMethodsController } from './fan-payment-methods.controller';
import { FanPaymentMethodsService } from './fan-payment-methods.service';

// HU-GC-10 (métodos de pago del aficionado). Usa los services de aficionados y del catálogo, y
// BetSettlementModule y TicketUsageModule para no eliminar un método con apuestas o boletos. Se exporta el service para las
// apuestas (HU-GC-11), que se pagan con uno de estos métodos.
@Module({
  imports: [
    TypeOrmModule.forFeature([FanPaymentMethod]),
    FansModule,
    PaymentMethodsModule,
    BetSettlementModule,
    TicketUsageModule,
  ],
  controllers: [FanPaymentMethodsController],
  providers: [FanPaymentMethodsService],
  exports: [FanPaymentMethodsService],
})
export class FanPaymentMethodsModule {}
