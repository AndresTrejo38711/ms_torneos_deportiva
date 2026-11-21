import { Module } from '@nestjs/common';
import { PaymentGateway } from './payment-gateway';
import { SimulatedPaymentGateway } from './simulated-payment.gateway';

// La pasarela de pago de la venta de entradas (HU-GE-04). Quien la usa pide PaymentGateway y recibe
// la que se configure aquí: por ahora la simulada. ePayco entra en el bloque 4 sin cambiar a quien la
// usa.
@Module({
  providers: [{ provide: PaymentGateway, useClass: SimulatedPaymentGateway }],
  exports: [PaymentGateway],
})
export class PaymentsModule {}
