import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

// El nivel de una habilidad va de 1 a 100. Sin nivel, la asignación queda en el punto medio.
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 100;
export const DEFAULT_LEVEL = 50;

// Cuerpo de POST /player-skills: qué habilidad se le asigna a qué jugador y, si se quiere, con qué
// nivel.
export class CreatePlayerSkillDto {
  @IsNotEmpty({ message: 'El id del jugador es obligatorio' })
  @IsInt({ message: 'El id del jugador debe ser un número entero' })
  @IsPositive({ message: 'El id del jugador debe ser mayor que 0' })
  playerId: number;

  @IsNotEmpty({ message: 'El id de la habilidad es obligatorio' })
  @IsInt({ message: 'El id de la habilidad debe ser un número entero' })
  @IsPositive({ message: 'El id de la habilidad debe ser mayor que 0' })
  skillId: number;

  // Opcional: de 1 a 100. Si no se envía, queda en 50.
  @IsOptional()
  @IsInt({ message: 'El nivel debe ser un número entero' })
  @Min(MIN_LEVEL, { message: 'El nivel debe estar entre 1 y 100' })
  @Max(MAX_LEVEL, { message: 'El nivel debe estar entre 1 y 100' })
  level?: number | null;
}
