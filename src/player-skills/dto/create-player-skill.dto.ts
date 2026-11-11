import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

// Cuerpo de POST /player-skills: qué habilidad se le asigna a qué jugador.
export class CreatePlayerSkillDto {
  @IsNotEmpty({ message: 'El id del jugador es obligatorio' })
  @IsInt({ message: 'El id del jugador debe ser un número entero' })
  @IsPositive({ message: 'El id del jugador debe ser mayor que 0' })
  playerId: number;

  @IsNotEmpty({ message: 'El id de la habilidad es obligatorio' })
  @IsInt({ message: 'El id de la habilidad debe ser un número entero' })
  @IsPositive({ message: 'El id de la habilidad debe ser mayor que 0' })
  skillId: number;
}
