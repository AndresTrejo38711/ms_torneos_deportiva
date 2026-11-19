import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { MatchFieldsDto } from './match-fields.dto';

// Cuerpo de POST /matches. Ejemplos:
// { "phaseId": 1, "homeTeamId": 3, "awayTeamId": 5, "scheduledAt": "2030-02-10T18:00", "round": 1 }
// { "phaseId": 2, "homeTeamId": 3, "awayTeamId": 8, "scheduledAt": "2030-05-10T15:00", "bracketPosition": 1 }
// El estado no se envía: el partido nuevo queda PROGRAMADO.
export class CreateMatchDto extends MatchFieldsDto {
  @IsNotEmpty({ message: 'El id de la fase es obligatorio' })
  @IsInt({ message: 'El id de la fase debe ser un número entero' })
  @IsPositive({ message: 'El id de la fase debe ser mayor que 0' })
  phaseId: number;
}
