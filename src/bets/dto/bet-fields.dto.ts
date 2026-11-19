import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { BetSelection } from '../entities/bet.enums';

// Límites del valor de una apuesta, en pesos (HU-GC-11, criterio 9).
export const MIN_BET_AMOUNT = 1000;
export const MAX_BET_AMOUNT = 5000000;

const AMOUNT_RANGE =
  'El valor debe ser un número entero de pesos entre 1.000 y 5.000.000';

// Lo que se puede cambiar de una apuesta antes de que empiece el partido: el valor y el método de
// pago. La selección no, porque su cuota quedó fija al apostar.
export class BetChangeableFieldsDto {
  @IsNotEmpty({ message: 'El valor de la apuesta es obligatorio' })
  @IsInt({ message: AMOUNT_RANGE })
  @Min(MIN_BET_AMOUNT, { message: AMOUNT_RANGE })
  @Max(MAX_BET_AMOUNT, { message: AMOUNT_RANGE })
  amount: number;

  // Uno de los métodos de pago del aficionado (HU-GC-10).
  @IsNotEmpty({ message: 'El método de pago es obligatorio' })
  @IsInt({ message: 'El id del método de pago debe ser un número entero' })
  @IsPositive({ message: 'El id del método de pago debe ser mayor que 0' })
  fanPaymentMethodId: number;
}

// Cuerpo de POST /bets. Ejemplo (el aficionado sale del token y la cuota del partido):
// { "matchId": 12, "selection": "LOCAL", "amount": 10000, "fanPaymentMethodId": 3 }
export class CreateBetDto extends BetChangeableFieldsDto {
  @IsNotEmpty({ message: 'El partido es obligatorio' })
  @IsInt({ message: 'El id del partido debe ser un número entero' })
  @IsPositive({ message: 'El id del partido debe ser mayor que 0' })
  matchId: number;

  @IsNotEmpty({ message: 'La selección es obligatoria' })
  @IsEnum(BetSelection, {
    message: 'La selección debe ser LOCAL, EMPATE o VISITANTE',
  })
  selection: BetSelection;
}

// Cuerpo de PUT /bets/{id}: { "amount": 15000, "fanPaymentMethodId": 3 }
export class UpdateBetDto extends BetChangeableFieldsDto {}
