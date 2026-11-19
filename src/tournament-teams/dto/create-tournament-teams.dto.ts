import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
} from 'class-validator';

// Cuerpo de POST /tournament-teams: en qué torneo se inscriben y qué equipos (uno o varios).
// Ejemplo: { "tournamentId": 1, "teamIds": [3, 5, 8] }
export class CreateTournamentTeamsDto {
  @IsNotEmpty({ message: 'El id del torneo es obligatorio' })
  @IsInt({ message: 'El id del torneo debe ser un número entero' })
  @IsPositive({ message: 'El id del torneo debe ser mayor que 0' })
  tournamentId: number;

  @IsNotEmpty({ message: 'La lista de equipos es obligatoria' })
  @IsArray({ message: 'Los equipos deben ser una lista de ids: [3, 5, 8]' })
  @ArrayNotEmpty({ message: 'Elige al menos un equipo' })
  @ArrayMaxSize(64, {
    message: 'Se pueden inscribir máximo 64 equipos a la vez',
  })
  @ArrayUnique({ message: 'Un equipo no puede aparecer dos veces en la lista' })
  @IsInt({ each: true, message: 'Cada id de equipo debe ser un número entero' })
  @IsPositive({ each: true, message: 'Cada id de equipo debe ser mayor que 0' })
  teamIds: number[];
}
