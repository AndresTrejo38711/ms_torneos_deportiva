import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethodKind } from '../payment-methods/entities/payment-method-kind.enum';
import {
  PaymentCheck,
  PaymentGateway,
  PaymentRequest,
  PaymentResult,
  PaymentStart,
} from './payment-gateway';

// Las tarjetas de prueba de ePayco, por sus últimos 4 dígitos (docs.davipay.com, "Medios de pagos en
// pruebas"). Cualquier otro método de pago se aprueba.
const TEST_CARDS: Record<string, PaymentStart> = {
  // Visa 4151 6115 2758 3283.
  '3283': { status: 'RECHAZADO', reason: 'Fondos insuficientes' },
  // Mastercard 5170 3944 9037 9427.
  '9427': {
    status: 'RECHAZADO',
    reason: 'Error de comunicación con el centro de autorizaciones',
  },
  // American Express 3731 188564 57642: queda pendiente y se confirma después.
  '7642': { status: 'PENDIENTE', checkout: {} },
};

// Pasarela de pruebas: no mueve dinero y sirve para probar la venta de entradas de punta a punta
// (Postman incluido) sin una cuenta de ePayco. Imita las tarjetas de prueba de ePayco según los
// últimos 4 dígitos de la tarjeta registrada; lo demás se aprueba al instante.
@Injectable()
export class SimulatedPaymentGateway extends PaymentGateway {
  readonly name = 'simulada';

  private readonly logger = new Logger(SimulatedPaymentGateway.name);

  start(request: PaymentRequest): Promise<PaymentStart> {
    const { method } = request;
    const card =
      method.kind === PaymentMethodKind.TARJETA && method.lastFour
        ? TEST_CARDS[method.lastFour]
        : undefined;
    const outcome: PaymentStart =
      card?.status === 'PENDIENTE'
        ? {
            status: 'PENDIENTE',
            checkout: { sessionId: `SIM-${request.reference}`, test: true },
          }
        : (card ?? { status: 'APROBADO' });
    this.logger.log(
      `Cobro ${request.reference} (${request.amount} pesos): ${outcome.status} en la pasarela simulada`,
    );
    return Promise.resolve(outcome);
  }

  // Aquí no hay a dónde ir a pagar: la referencia que se envía decide el resultado. Si termina en
  // "-RECHAZADA", el pago se rechaza; en "-PENDIENTE", sigue pendiente; cualquier otra, se aprueba.
  check(request: PaymentCheck): Promise<PaymentResult> {
    const ref = request.gatewayReference.toUpperCase();
    const result: PaymentResult = ref.endsWith('-RECHAZADA')
      ? { status: 'RECHAZADO', reason: 'Fondos insuficientes' }
      : ref.endsWith('-PENDIENTE')
        ? {
            status: 'PENDIENTE',
            reason: 'Transacción pendiente por validación',
          }
        : { status: 'APROBADO' };
    this.logger.log(
      `Pago ${request.reference}: ${result.status} en la pasarela simulada`,
    );
    return Promise.resolve(result);
  }
}
