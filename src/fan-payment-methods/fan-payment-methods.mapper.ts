import { toPaymentMethodResponse } from '../payment-methods/payment-methods.mapper';
import { FanPaymentMethodResponseDto } from './dto/fan-payment-method-response.dto';
import { FanPaymentMethod } from './entities/fan-payment-method.entity';
import { isExpired } from './payment-data.rules';

// Entidad → DTO de respuesta. Debe venir con paymentMethod cargado.
export function toFanPaymentMethodResponse(
  method: FanPaymentMethod,
): FanPaymentMethodResponseDto {
  return {
    id: method.id,
    paymentMethod: toPaymentMethodResponse(method.paymentMethod),
    alias: method.alias,
    holderName: method.holderName,
    brand: method.brand,
    lastFour: method.lastFour,
    expiryMonth: method.expiryMonth,
    expiryYear: method.expiryYear,
    bankName: method.bankName,
    accountType: method.accountType,
    phone: method.phone,
    expired: isExpired(method),
    active: method.active,
  };
}
