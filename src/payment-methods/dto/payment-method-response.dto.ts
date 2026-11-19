import { PaymentMethodKind } from '../entities/payment-method-kind.enum';

// Un método del catálogo. kind dice qué datos pide al registrarlo.
export class PaymentMethodResponseDto {
  id: number;
  code: string;
  name: string;
  kind: PaymentMethodKind;
}
