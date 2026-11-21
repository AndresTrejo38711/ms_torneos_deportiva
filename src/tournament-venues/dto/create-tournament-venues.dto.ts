import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
} from 'class-validator';

// Cuerpo de POST /tournament-venues: a qué torneo y qué escenarios (uno o varios).
// Ejemplo: { "tournamentId": 1, "venueIds": [3, 4] }
export class CreateTournamentVenuesDto {
  @IsNotEmpty({ message: 'El id del torneo es obligatorio' })
  @IsInt({ message: 'El id del torneo debe ser un número entero' })
  @IsPositive({ message: 'El id del torneo debe ser mayor que 0' })
  tournamentId: number;

  @IsNotEmpty({ message: 'La lista de escenarios es obligatoria' })
  @IsArray({ message: 'Los escenarios deben ser una lista de ids: [3, 4]' })
  @ArrayNotEmpty({ message: 'Elige al menos un escenario' })
  @ArrayMaxSize(50, {
    message: 'Se pueden asignar máximo 50 escenarios a la vez',
  })
  @ArrayUnique({
    message: 'Un escenario no puede aparecer dos veces en la lista',
  })
  @IsInt({
    each: true,
    message: 'Cada id de escenario debe ser un número entero',
  })
  @IsPositive({
    each: true,
    message: 'Cada id de escenario debe ser mayor que 0',
  })
  venueIds: number[];
}
