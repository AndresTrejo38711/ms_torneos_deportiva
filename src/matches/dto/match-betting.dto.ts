import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

const ODDS_RANGE =
  'debe ser un número entre 1.01 y 100, con máximo 2 decimales';
const DECIMALS = { maxDecimalPlaces: 2 };

// Cuerpo de PUT /matches/{id}/betting (HU-GC-11). Ejemplos:
// { "homeOdds": 1.8, "drawOdds": 3.2, "awayOdds": 4.5, "open": true }   (fase de grupos)
// { "homeOdds": 1.9, "awayOdds": 2.5, "open": true }                    (fase final: sin empate)
// Que el empate lleve cuota o no depende de la fase: lo revisa el service.
export class MatchBettingDto {
  @IsNotEmpty({ message: 'La cuota del local es obligatoria' })
  @IsNumber(DECIMALS, { message: `La cuota del local ${ODDS_RANGE}` })
  @Min(1.01, { message: `La cuota del local ${ODDS_RANGE}` })
  @Max(100, { message: `La cuota del local ${ODDS_RANGE}` })
  homeOdds: number;

  @IsOptional()
  @IsNumber(DECIMALS, { message: `La cuota del empate ${ODDS_RANGE}` })
  @Min(1.01, { message: `La cuota del empate ${ODDS_RANGE}` })
  @Max(100, { message: `La cuota del empate ${ODDS_RANGE}` })
  drawOdds?: number | null;

  @IsNotEmpty({ message: 'La cuota del visitante es obligatoria' })
  @IsNumber(DECIMALS, { message: `La cuota del visitante ${ODDS_RANGE}` })
  @Min(1.01, { message: `La cuota del visitante ${ODDS_RANGE}` })
  @Max(100, { message: `La cuota del visitante ${ODDS_RANGE}` })
  awayOdds: number;

  // true: recibe apuestas nuevas; false: las cierra (las ya hechas siguen igual).
  @IsNotEmpty({ message: 'Indica si las apuestas quedan abiertas (open)' })
  @IsBoolean({ message: 'open debe ser true o false' })
  open: boolean;
}
