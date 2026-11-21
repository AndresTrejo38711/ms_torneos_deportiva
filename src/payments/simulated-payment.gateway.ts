import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentGateway,
  PaymentRequest,
  PaymentStart,
} from './payment-gateway';

// Pasarela de pruebas: aprueba cada cobro al instante y no mueve dinero. Sirve para probar la venta
// de entradas de punta a punta (Postman incluido) sin una cuenta de ePayco.
@Injectable()
export class SimulatedPaymentGateway extends PaymentGateway {
  readonly name = 'simulada';

  private readonly logger = new Logger(SimulatedPaymentGateway.name);

  start(request: PaymentRequest): Promise<PaymentStart> {
    this.logger.log(
      `Cobro ${request.reference} aprobado por la pasarela simulada (${request.amount} pesos)`,
    );
    return Promise.resolve({ status: 'APROBADO' });
  }
}
