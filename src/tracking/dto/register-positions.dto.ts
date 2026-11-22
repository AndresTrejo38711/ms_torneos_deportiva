import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// Cuántas posiciones caben en una petición: los 22 jugadores de un partido de fútbol y la pelota, con
// espacio de sobra.
export const MAX_POSITIONS_PER_REQUEST = 50;

const COORDINATE = 'debe ser un número entre 0 y 100, con máximo 2 decimales';
const DECIMALS = { maxDecimalPlaces: 2 };

// Una posición: de un jugador (playerId) o de la pelota ("ball": true), nunca de los dos. Eso, y que
// el jugador juegue el partido, lo revisa el service.
export class PositionInputDto {
  @IsOptional()
  @IsInt({ message: 'El id del jugador debe ser un número entero' })
  @IsPositive({ message: 'El id del jugador debe ser mayor que 0' })
  playerId?: number | null;

  @IsOptional()
  @IsBoolean({ message: 'ball debe ser true o false' })
  ball?: boolean | null;

  // Porcentaje del ancho del campo: 0 es el arco (o la línea de fondo) del local.
  @IsNotEmpty({ message: 'La coordenada x es obligatoria' })
  @IsNumber(DECIMALS, { message: `La coordenada x ${COORDINATE}` })
  @Min(0, { message: `La coordenada x ${COORDINATE}` })
  @Max(100, { message: `La coordenada x ${COORDINATE}` })
  x: number;

  // Porcentaje del alto del campo: 0 es la banda de arriba.
  @IsNotEmpty({ message: 'La coordenada y es obligatoria' })
  @IsNumber(DECIMALS, { message: `La coordenada y ${COORDINATE}` })
  @Min(0, { message: `La coordenada y ${COORDINATE}` })
  @Max(100, { message: `La coordenada y ${COORDINATE}` })
  y: number;
}

// Cuerpo de POST /tracking/matches/{matchId}/positions (HU-GC-09). Ejemplo:
// { "positions": [{ "playerId": 7, "x": 54, "y": 31 }, { "ball": true, "x": 57, "y": 29 }] }
// Se guardan todas o ninguna.
export class RegisterPositionsDto {
  @IsNotEmpty({ message: 'La lista de posiciones es obligatoria' })
  @IsArray({
    message:
      'Las posiciones deben ser una lista: [{ "playerId": 7, "x": 54, "y": 31 }, { "ball": true, "x": 57, "y": 29 }]',
  })
  @ArrayMinSize(1, { message: 'Envía al menos una posición' })
  @ArrayMaxSize(MAX_POSITIONS_PER_REQUEST, {
    message: `Se pueden registrar máximo ${MAX_POSITIONS_PER_REQUEST} posiciones por petición`,
  })
  @ValidateNested({ each: true })
  @Type(() => PositionInputDto)
  positions: PositionInputDto[];
}
