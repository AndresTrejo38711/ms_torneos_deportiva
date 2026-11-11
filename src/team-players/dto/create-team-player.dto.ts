import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import {
  IsDateOnly,
  IsNotBeforeDate,
} from '../../common/validation/date.validators';

// Cuerpo de POST /team-players: qué jugador entra a qué equipo y entre qué fechas.
export class CreateTeamPlayerDto {
  @IsNotEmpty({ message: 'El id del equipo es obligatorio' })
  @IsInt({ message: 'El id del equipo debe ser un número entero' })
  @IsPositive({ message: 'El id del equipo debe ser mayor que 0' })
  teamId: number;

  @IsNotEmpty({ message: 'El id del jugador es obligatorio' })
  @IsInt({ message: 'El id del jugador debe ser un número entero' })
  @IsPositive({ message: 'El id del jugador debe ser mayor que 0' })
  playerId: number;

  // Puede ser pasada (para registrar contratos antiguos) o futura.
  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  @IsDateOnly({
    message:
      'La fecha de inicio debe ser una fecha real con el formato AAAA-MM-DD',
  })
  startDate: string;

  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  @IsDateOnly({
    message:
      'La fecha de fin debe ser una fecha real con el formato AAAA-MM-DD',
  })
  @IsNotBeforeDate('startDate', {
    message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
  })
  endDate: string;
}
