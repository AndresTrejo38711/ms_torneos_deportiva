import { PaymentMethodKind } from './entities/payment-method-kind.enum';

// Lo que el seeder deja en la tabla payment_methods. Para sumar un método, se agrega aquí y se
// reinicia: el seeder solo crea los que falten (por su código) y no toca los que ya existen.
// Son formas de pago que ePayco acepta (Anexo 4: el cobro de los boletos).
export const PAYMENT_METHOD_CATALOG: {
  code: string;
  name: string;
  kind: PaymentMethodKind;
}[] = [
  {
    code: 'TARJETA_CREDITO',
    name: 'Tarjeta de crédito',
    kind: PaymentMethodKind.TARJETA,
  },
  {
    code: 'TARJETA_DEBITO',
    name: 'Tarjeta de débito',
    kind: PaymentMethodKind.TARJETA,
  },
  { code: 'PSE', name: 'PSE', kind: PaymentMethodKind.CUENTA_BANCARIA },
  { code: 'NEQUI', name: 'Nequi', kind: PaymentMethodKind.BILLETERA },
  { code: 'DAVIPLATA', name: 'Daviplata', kind: PaymentMethodKind.BILLETERA },
];
