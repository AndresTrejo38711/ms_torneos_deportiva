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
  // Con qué paga el aficionado (HU-GE-04, criterio 18: "según el método de pago seleccionado"): code
  // es el del catálogo ("TARJETA_CREDITO", "PSE", "NEQUI"...).
  method: { code: string; kind: PaymentMethodKind; lastFour: string | null };
}

// Cómo quedó el cobro al iniciarlo:
// - APROBADO: pagado de una vez.
// - RECHAZADO: la pasarela no lo aprobó (reason dice por qué).
// - PENDIENTE: el aficionado debe terminar de pagar en la pasarela (checkout trae lo que el front
//   necesita para abrirla); el resultado se confirma después con check().
export type PaymentStart =
  | { status: 'APROBADO' }
  | { status: 'RECHAZADO'; reason: string }
  | { status: 'PENDIENTE'; checkout: Record<string, unknown> };

// Lo que se le pregunta a la pasarela para confirmar un pago que quedó pendiente.
export interface PaymentCheck {
  // La de la compra y lo que debía cobrarse: la pasarela revisa que su pago sea de esa compra y por
  // ese valor.
  reference: string;
  amount: number;
  // La que la pasarela le dio al aficionado al pagar (en ePayco, ref_payco).
  gatewayReference: string;
}

// Lo que dice la pasarela de ese pago. reason es su explicación ("Fondos insuficientes",
// "Transacción pendiente por validación").
export type PaymentResult =
  | { status: 'APROBADO' }
  | { status: 'RECHAZADO'; reason: string }
  | { status: 'PENDIENTE'; reason: string };

// La pasarela de pago, sin decir cuál (D de SOLID): la venta de entradas depende de esta clase y no
// de una pasarela concreta. PaymentsModule decide cuál se usa según PAYMENTS_PROVIDER: la simulada o
// ePayco.
export abstract class PaymentGateway {
  // Para los mensajes y el log: "simulada", "ePayco".
  abstract readonly name: string;

  abstract start(request: PaymentRequest): Promise<PaymentStart>;

  // Nunca se le cree al navegador: el resultado de un pago se le pregunta a la pasarela.
  abstract check(request: PaymentCheck): Promise<PaymentResult>;
}
