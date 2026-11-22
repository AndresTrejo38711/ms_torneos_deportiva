import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EpaycoPaymentGateway } from './epayco-payment.gateway';
import { PaymentGateway } from './payment-gateway';
import { SimulatedPaymentGateway } from './simulated-payment.gateway';

// La pasarela de pago de la venta de entradas (HU-GE-04). Quien la usa pide PaymentGateway y recibe
// la que diga PAYMENTS_PROVIDER: "simulada" (por defecto; la usan las pruebas de Postman) o "epayco".
// Si falta una llave de ePayco, el microservicio no arranca y la consola dice cuál.
@Module({
  providers: [
    {
      provide: PaymentGateway,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PaymentGateway => {
        const provider = config
          .get<string>('PAYMENTS_PROVIDER', 'simulada')
          .trim()
          .toLowerCase();
        if (provider === 'epayco') {
          return new EpaycoPaymentGateway(config);
        }
        if (provider !== 'simulada') {
          throw new Error(
            `PAYMENTS_PROVIDER debe ser "simulada" o "epayco" (en el .env dice "${provider}")`,
          );
        }
        return new SimulatedPaymentGateway();
      },
    },
  ],
  exports: [PaymentGateway],
})
export class PaymentsModule {}
