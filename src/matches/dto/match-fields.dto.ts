import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { IsLocalDateTime } from '../../common/validation/date.validators';

// Los datos de un partido que se envían al crearlo y al editarlo. Lo que depende del tipo de fase
// (jornada solo en grupos, posición en la llave solo en finales) lo revisa el service, que es el que
// conoce la fase.
export class MatchFieldsDto {
  @IsNotEmpty({ message: 'El id del equipo local es obligatorio' })
  @IsInt({ message: 'El id del equipo local debe ser un número entero' })
  @IsPositive({ message: 'El id del equipo local debe ser mayor que 0' })
  homeTeamId: number;

  @IsNotEmpty({ message: 'El id del equipo visitante es obligatorio' })
  @IsInt({ message: 'El id del equipo visitante debe ser un número entero' })
  @IsPositive({ message: 'El id del equipo visitante debe ser mayor que 0' })
  awayTeamId: number;

  // Fecha y hora local, por ejemplo "2030-02-10T18:00".
  @IsNotEmpty({ message: 'La fecha y hora del partido es obligatoria' })
  @IsLocalDateTime({
    message:
      'La fecha y hora debe tener el formato AAAA-MM-DDTHH:mm, por ejemplo 2030-02-10T18:00',
  })
  scheduledAt: string;

  // Opcional, solo en fase de grupos.
  @IsOptional()
  @IsInt({ message: 'La jornada debe ser un número entero entre 1 y 99' })
  @Min(1, { message: 'La jornada debe ser un número entero entre 1 y 99' })
  @Max(99, { message: 'La jornada debe ser un número entero entre 1 y 99' })
  round?: number | null;

  // Obligatoria en fase final; no se usa en fase de grupos.
  @IsOptional()
  @IsInt({ message: 'La posición en la llave debe ser un número entero' })
  @Min(1, { message: 'La posición en la llave debe ser mayor que 0' })
  bracketPosition?: number | null;
}
