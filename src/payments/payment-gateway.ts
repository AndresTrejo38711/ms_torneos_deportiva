import { PaymentMethodKind } from '../payment-methods/entities/payment-method-kind.enum';

// Lo que se le pide cobrar a la pasarela de pago.
export interface PaymentRequest {
  // Identifica la compra ante la pasarela (todos los boletos de una compra la comparten).
  reference: string;
  // Pesos, sin centavos.
  amount: number;
  // "2 boletos · Leones vs Morsas · Norte".
  description: string;
  buyerEmail: string;
  // Con qué paga el aficionado (HU-GE-04, criterio 18: "según el método de pago seleccionado").
  methodKind: PaymentMethodKind;
}

// Cómo quedó el cobro al iniciarlo:
// - APROBADO: pagado de una vez.
// - RECHAZADO: la pasarela no lo aprobó (reason dice por qué).
// - PENDIENTE: el aficionado debe terminar de pagar en la pasarela (checkout trae lo que el front
//   necesita para abrirla); el resultado llega después.
export type PaymentStart =
  | { status: 'APROBADO' }
  | { status: 'RECHAZADO'; reason: string }
  | { status: 'PENDIENTE'; checkout: Record<string, unknown> };

// La pasarela de pago, sin decir cuál (D de SOLID): la venta de entradas depende de esta clase y no
// de una pasarela concreta. PaymentsModule decide cuál se usa: por ahora la simulada; con el bloque 4
// del Anexo 4, ePayco.
export abstract class PaymentGateway {
  // Para los mensajes y el log: "simulada", "ePayco".
  abstract readonly name: string;

  abstract start(request: PaymentRequest): Promise<PaymentStart>;
}
