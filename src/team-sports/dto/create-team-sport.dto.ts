import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

// Cuerpo de POST /team-sports: qué equipo y qué deporte se asocian.
export class CreateTeamSportDto {
  @IsNotEmpty({ message: 'El id del equipo es obligatorio' })
  @IsInt({ message: 'El id del equipo debe ser un número entero' })
  @IsPositive({ message: 'El id del equipo debe ser mayor que 0' })
  teamId: number;

  @IsNotEmpty({ message: 'El id del deporte es obligatorio' })
  @IsInt({ message: 'El id del deporte debe ser un número entero' })
  @IsPositive({ message: 'El id del deporte debe ser mayor que 0' })
  sportId: number;
}
