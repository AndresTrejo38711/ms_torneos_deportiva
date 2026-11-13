import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { MAX_LEVEL, MIN_LEVEL } from './create-player-skill.dto';

// Cuerpo de PATCH /player-skills/{playerId}/{skillId}: el nivel nuevo de esa habilidad.
export class UpdatePlayerSkillDto {
  @IsNotEmpty({ message: 'El nivel es obligatorio' })
  @IsInt({ message: 'El nivel debe ser un número entero' })
  @Min(MIN_LEVEL, { message: 'El nivel debe estar entre 1 y 100' })
  @Max(MAX_LEVEL, { message: 'El nivel debe estar entre 1 y 100' })
  level: number;
}
