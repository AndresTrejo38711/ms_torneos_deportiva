import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { PaymentDataFieldsDto } from './payment-data-fields.dto';

// Cuerpo de POST /fan-payment-methods. Ejemplos (el aficionado sale del token, nunca del cuerpo):
// { "paymentMethodId": 1, "alias": "Mi Visa", "holderName": "Ana Gómez", "brand": "VISA",
//   "lastFour": "4242", "expiryMonth": 8, "expiryYear": 2031 }
// { "paymentMethodId": 3, "bankName": "Bancolombia", "accountType": "AHORROS", "lastFour": "1234" }
// { "paymentMethodId": 4, "phone": "3001234567" }
export class CreateFanPaymentMethodDto extends PaymentDataFieldsDto {
  @IsNotEmpty({ message: 'El método de pago del catálogo es obligatorio' })
  @IsInt({ message: 'El id del método de pago debe ser un número entero' })
  @IsPositive({ message: 'El id del método de pago debe ser mayor que 0' })
  paymentMethodId: number;
}
