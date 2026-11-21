import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsPositive,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_TICKET_PRICE, MIN_TICKET_PRICE } from '../ticket-rules';

const PRICE_RANGE =
  'El precio debe ser un número entero de pesos entre 1.000 y 2.000.000';

// El precio de una localidad en el partido.
export class TicketPriceDto {
  @IsNotEmpty({ message: 'El id de la localidad es obligatorio' })
  @IsInt({ message: 'El id de la localidad debe ser un número entero' })
  @IsPositive({ message: 'El id de la localidad debe ser mayor que 0' })
  localityId: number;

  @IsNotEmpty({ message: 'El precio es obligatorio' })
  @IsInt({ message: PRICE_RANGE })
  @Min(MIN_TICKET_PRICE, { message: PRICE_RANGE })
  @Max(MAX_TICKET_PRICE, { message: PRICE_RANGE })
  price: number;
}

// Cuerpo de PUT /matches/{id}/ticketing (HU-GE-04). Ejemplo:
// { "open": true, "prices": [{ "localityId": 4, "price": 30000 }, { "localityId": 6, "price": 80000 }] }
// Reemplaza los precios del partido: una localidad que no esté en la lista deja de venderse. Que cada
// localidad sea del escenario del partido lo revisa el service.
export class MatchTicketingDto {
  // true: vende boletos; false: cierra la venta (los ya vendidos siguen igual).
  @IsNotEmpty({ message: 'Indica si la venta queda abierta (open)' })
  @IsBoolean({ message: 'open debe ser true o false' })
  open: boolean;

  @IsNotEmpty({
    message:
      'La lista de precios es obligatoria (puede ir vacía para cerrar la venta)',
  })
  @IsArray({
    message:
      'Los precios deben ser una lista: [{ "localityId": 4, "price": 30000 }]',
  })
  @ArrayMaxSize(50, { message: 'Se pueden fijar máximo 50 precios' })
  @ValidateNested({ each: true })
  @Type(() => TicketPriceDto)
  prices: TicketPriceDto[];
}
