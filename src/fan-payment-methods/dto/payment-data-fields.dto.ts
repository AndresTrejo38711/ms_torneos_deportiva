import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';
import { AccountType, CardBrand } from '../entities/payment-data.enums';

// Los datos de un método de pago que se envían al crearlo y al editarlo. Aquí solo se revisa el
// formato de lo que llegue: cuáles son obligatorios depende del tipo del catálogo (tarjeta, cuenta
// bancaria o billetera) y eso lo revisa el service, que conoce el tipo (payment-data.rules.ts).
//
// No hay campos para el número completo ni para el CVV: si llegan, la validación los descarta.
export class PaymentDataFieldsDto {
  @IsOptional()
  @Trim()
  @IsString({ message: 'El alias debe ser texto' })
  @MaxLength(40, { message: 'El alias no puede superar 40 caracteres' })
  alias?: string | null;

  // Tarjeta.
  @IsOptional()
  @Trim()
  @IsString({ message: 'El titular debe ser texto' })
  @Length(3, 100, { message: 'El titular debe tener entre 3 y 100 caracteres' })
  holderName?: string | null;

  @IsOptional()
  @IsEnum(CardBrand, {
    message: 'La franquicia debe ser VISA, MASTERCARD, AMEX o DINERS',
  })
  brand?: CardBrand | null;

  // Tarjeta o cuenta bancaria.
  @IsOptional()
  @Matches(/^\d{4}$/, {
    message:
      'Los últimos 4 dígitos deben ser exactamente 4 números (nunca el número completo)',
  })
  lastFour?: string | null;

  @IsOptional()
  @IsInt({ message: 'El mes de vencimiento debe ser un número entre 1 y 12' })
  @Min(1, { message: 'El mes de vencimiento debe ser un número entre 1 y 12' })
  @Max(12, { message: 'El mes de vencimiento debe ser un número entre 1 y 12' })
  expiryMonth?: number | null;

  @IsOptional()
  @IsInt({
    message: 'El año de vencimiento debe tener 4 dígitos, por ejemplo 2030',
  })
  @Min(2000, {
    message: 'El año de vencimiento debe tener 4 dígitos, por ejemplo 2030',
  })
  @Max(2100, {
    message: 'El año de vencimiento debe tener 4 dígitos, por ejemplo 2030',
  })
  expiryYear?: number | null;

  // Cuenta bancaria.
  @IsOptional()
  @Trim()
  @IsString({ message: 'El banco debe ser texto' })
  @Length(2, 60, { message: 'El banco debe tener entre 2 y 60 caracteres' })
  bankName?: string | null;

  @IsOptional()
  @IsEnum(AccountType, {
    message: 'El tipo de cuenta debe ser AHORROS o CORRIENTE',
  })
  accountType?: AccountType | null;

  // Billetera.
  @IsOptional()
  @Matches(/^3\d{9}$/, {
    message: 'El celular debe tener 10 dígitos y empezar por 3',
  })
  phone?: string | null;
}
