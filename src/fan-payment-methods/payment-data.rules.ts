import { ValidationException } from '../common/errors/validation.exception';
import {
  PAYMENT_METHOD_KIND_LABEL,
  PaymentMethodKind,
} from '../payment-methods/entities/payment-method-kind.enum';
import { PaymentDataFieldsDto } from './dto/payment-data-fields.dto';
import { AccountType, CardBrand } from './entities/payment-data.enums';

// Reglas de los datos de un método de pago según su tipo (HU-GC-10, criterio 7). No hacen consultas.

// Lo que se guarda de un método además de su tipo y su alias.
export interface PaymentData {
  holderName: string | null;
  brand: CardBrand | null;
  lastFour: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  bankName: string | null;
  accountType: AccountType | null;
  phone: string | null;
}

type DataField = keyof PaymentData;

// Lo obligatorio de cada tipo, con el inicio de su mensaje.
const REQUIRED: Record<PaymentMethodKind, [DataField, string][]> = {
  [PaymentMethodKind.TARJETA]: [
    ['holderName', 'El titular es obligatorio'],
    ['brand', 'La franquicia es obligatoria'],
    ['lastFour', 'Los últimos 4 dígitos son obligatorios'],
    ['expiryMonth', 'El mes de vencimiento es obligatorio'],
    ['expiryYear', 'El año de vencimiento es obligatorio'],
  ],
  [PaymentMethodKind.CUENTA_BANCARIA]: [
    ['bankName', 'El banco es obligatorio'],
    ['accountType', 'El tipo de cuenta es obligatorio'],
    ['lastFour', 'Los últimos 4 dígitos son obligatorios'],
  ],
  [PaymentMethodKind.BILLETERA]: [['phone', 'El celular es obligatorio']],
};

// Los datos de su tipo, y los demás en null (los que no son de su tipo se ignoran). Si falta alguno
// obligatorio, responde 400 con un mensaje por campo, como las demás validaciones.
export function paymentDataFor(
  kind: PaymentMethodKind,
  dto: PaymentDataFieldsDto,
): PaymentData {
  const errors: Record<string, string> = {};
  for (const [field, message] of REQUIRED[kind]) {
    const value = dto[field];
    if (value === undefined || value === null || value === '') {
      errors[field] = `${message} para ${PAYMENT_METHOD_KIND_LABEL[kind]}`;
    }
  }
  if (Object.keys(errors).length > 0) {
    throw new ValidationException(errors);
  }

  const data: PaymentData = {
    holderName: null,
    brand: null,
    lastFour: null,
    expiryMonth: null,
    expiryYear: null,
    bankName: null,
    accountType: null,
    phone: null,
  };
  switch (kind) {
    case PaymentMethodKind.TARJETA:
      return {
        ...data,
        holderName: dto.holderName ?? null,
        brand: dto.brand ?? null,
        lastFour: dto.lastFour ?? null,
        expiryMonth: dto.expiryMonth ?? null,
        expiryYear: dto.expiryYear ?? null,
      };
    case PaymentMethodKind.CUENTA_BANCARIA:
      return {
        ...data,
        bankName: dto.bankName ?? null,
        accountType: dto.accountType ?? null,
        lastFour: dto.lastFour ?? null,
      };
    case PaymentMethodKind.BILLETERA:
      return { ...data, phone: dto.phone ?? null };
  }
}

// Una tarjeta sirve hasta el último día de su mes de vencimiento. Lo que no es tarjeta no vence.
export function isExpired(
  data: Pick<PaymentData, 'expiryMonth' | 'expiryYear'>,
  today = new Date(),
): boolean {
  if (data.expiryMonth === null || data.expiryYear === null) {
    return false;
  }
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  return (
    data.expiryYear < year ||
    (data.expiryYear === year && data.expiryMonth < month)
  );
}

// "08/2031", para los mensajes.
export function expiryLabel(
  data: Pick<PaymentData, 'expiryMonth' | 'expiryYear'>,
): string {
  return `${String(data.expiryMonth).padStart(2, '0')}/${data.expiryYear}`;
}

// ¿Es la misma tarjeta, cuenta o billetera? (del mismo tipo del catálogo). El titular y el alias no
// cuentan: la misma tarjeta con otro alias sigue siendo la misma.
export function sameMethod(a: PaymentData, b: PaymentData): boolean {
  const bank = (value: string | null) => value?.toLocaleLowerCase('es') ?? null;
  return (
    a.brand === b.brand &&
    a.lastFour === b.lastFour &&
    a.expiryMonth === b.expiryMonth &&
    a.expiryYear === b.expiryYear &&
    bank(a.bankName) === bank(b.bankName) &&
    a.accountType === b.accountType &&
    a.phone === b.phone
  );
}
