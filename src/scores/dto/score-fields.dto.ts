import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

// Si no se envían, la anotación suma 1 (un gol).
export const DEFAULT_SCORE_POINTS = 1;

const MINUTE_RANGE = 'El minuto debe ser un número entero entre 1 y 200';
const POINTS_RANGE = 'Los puntos deben ser un número entero entre 1 y 10';

// Los datos de una anotación que se envían al crearla y al editarla. Que el equipo juegue el partido
// y que el jugador tenga contrato con él lo revisa el service, que conoce el partido.
export class ScoreFieldsDto {
  // El local o el visitante del partido.
  @IsNotEmpty({ message: 'El id del equipo es obligatorio' })
  @IsInt({ message: 'El id del equipo debe ser un número entero' })
  @IsPositive({ message: 'El id del equipo debe ser mayor que 0' })
  teamId: number;

  @IsNotEmpty({ message: 'El id del jugador es obligatorio' })
  @IsInt({ message: 'El id del jugador debe ser un número entero' })
  @IsPositive({ message: 'El id del jugador debe ser mayor que 0' })
  playerId: number;

  @IsNotEmpty({ message: 'El minuto es obligatorio' })
  @IsInt({ message: MINUTE_RANGE })
  @Min(1, { message: MINUTE_RANGE })
  @Max(200, { message: MINUTE_RANGE })
  minute: number;

  // Cuánto suma: 1 en fútbol; 1, 2 o 3 en baloncesto. Por defecto 1.
  @IsOptional()
  @IsInt({ message: POINTS_RANGE })
  @Min(1, { message: POINTS_RANGE })
  @Max(10, { message: POINTS_RANGE })
  points?: number | null;
}
