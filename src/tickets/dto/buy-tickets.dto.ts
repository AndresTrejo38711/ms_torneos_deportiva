import { IsInt, IsNotEmpty, IsPositive, Max, Min } from 'class-validator';
import { MAX_TICKETS_PER_PURCHASE } from '../ticket-rules';

const QUANTITY_RANGE = 'La cantidad debe ser un número entero entre 1 y 10';

// Cuerpo de POST /tickets. Ejemplo (el aficionado sale del token y el precio del partido):
// { "matchId": 12, "localityId": 4, "quantity": 2, "fanPaymentMethodId": 3 }
export class BuyTicketsDto {
  @IsNotEmpty({ message: 'El partido es obligatorio' })
  @IsInt({ message: 'El id del partido debe ser un número entero' })
  @IsPositive({ message: 'El id del partido debe ser mayor que 0' })
  matchId: number;

  @IsNotEmpty({ message: 'La localidad es obligatoria' })
  @IsInt({ message: 'El id de la localidad debe ser un número entero' })
  @IsPositive({ message: 'El id de la localidad debe ser mayor que 0' })
  localityId: number;

  @IsNotEmpty({ message: 'La cantidad de boletos es obligatoria' })
  @IsInt({ message: QUANTITY_RANGE })
  @Min(1, { message: QUANTITY_RANGE })
  @Max(MAX_TICKETS_PER_PURCHASE, { message: QUANTITY_RANGE })
  quantity: number;

  // Uno de los métodos de pago del aficionado (HU-GC-10).
  @IsNotEmpty({ message: 'El método de pago es obligatorio' })
  @IsInt({ message: 'El id del método de pago debe ser un número entero' })
  @IsPositive({ message: 'El id del método de pago debe ser mayor que 0' })
  fanPaymentMethodId: number;
}
