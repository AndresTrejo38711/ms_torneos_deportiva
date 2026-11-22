import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
} from 'class-validator';

// Cuerpo de POST /fan-teams: los equipos que el aficionado quiere seguir (uno o varios). El
// aficionado sale del token. Ejemplo: { "teamIds": [3, 8] }
export class CreateFanTeamsDto {
  @IsNotEmpty({ message: 'La lista de equipos es obligatoria' })
  @IsArray({ message: 'Los equipos deben ser una lista de ids: [3, 8]' })
  @ArrayNotEmpty({ message: 'Elige al menos un equipo' })
  @ArrayMaxSize(50, {
    message: 'Se pueden seguir máximo 50 equipos a la vez',
  })
  @ArrayUnique({
    message: 'Un equipo no puede aparecer dos veces en la lista',
  })
  @IsInt({
    each: true,
    message: 'Cada id de equipo debe ser un número entero',
  })
  @IsPositive({
    each: true,
    message: 'Cada id de equipo debe ser mayor que 0',
  })
  teamIds: number[];
}
