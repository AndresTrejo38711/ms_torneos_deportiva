import { PaymentMethodResponseDto } from '../../payment-methods/dto/payment-method-response.dto';
import { AccountType, CardBrand } from '../entities/payment-data.enums';

// Un método de pago del aficionado. Los datos que no son de su tipo llegan en null.
export class FanPaymentMethodResponseDto {
  id: number;
  paymentMethod: PaymentMethodResponseDto;
  alias: string | null;
  holderName: string | null;
  brand: CardBrand | null;
  lastFour: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  bankName: string | null;
  accountType: AccountType | null;
  phone: string | null;
  // Calculado con la fecha de hoy: solo una tarjeta puede vencerse.
  expired: boolean;
  active: boolean;
}
