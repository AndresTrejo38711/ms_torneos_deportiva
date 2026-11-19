// Tipo de método de pago: decide qué datos son obligatorios (HU-GC-10, criterio 7).
export enum PaymentMethodKind {
  TARJETA = 'TARJETA', // Titular, franquicia, últimos 4 dígitos y vencimiento
  CUENTA_BANCARIA = 'CUENTA_BANCARIA', // Banco, tipo de cuenta y últimos 4 dígitos
  BILLETERA = 'BILLETERA', // Celular
}

// Cómo se nombra cada tipo en los mensajes ("obligatorio para una tarjeta").
export const PAYMENT_METHOD_KIND_LABEL: Record<PaymentMethodKind, string> = {
  [PaymentMethodKind.TARJETA]: 'una tarjeta',
  [PaymentMethodKind.CUENTA_BANCARIA]: 'una cuenta bancaria',
  [PaymentMethodKind.BILLETERA]: 'una billetera digital',
};
