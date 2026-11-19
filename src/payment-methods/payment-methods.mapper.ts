import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';
import { PaymentMethod } from './entities/payment-method.entity';

// Entidad → DTO de respuesta.
export function toPaymentMethodResponse(
  method: PaymentMethod,
): PaymentMethodResponseDto {
  return {
    id: method.id,
    code: method.code,
    name: method.name,
    kind: method.kind,
  };
}
