import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

// Cuerpo de POST /tickets/payments/{reference}/confirm. Ejemplo, con la ref_payco que ePayco le da
// al aficionado al pagar: { "gatewayReference": "68fb83729d094878e015be00" }. Si ya se envió antes
// (el pago quedó pendiente), se puede omitir: se vuelve a consultar el mismo.
export class ConfirmPaymentDto {
  @IsOptional()
  @Trim()
  @IsString({ message: 'La referencia del pago debe ser un texto' })
  @Length(1, 40, {
    message: 'La referencia del pago debe tener entre 1 y 40 caracteres',
  })
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'La referencia del pago solo lleva letras, números y guiones',
  })
  gatewayReference?: string;
}
