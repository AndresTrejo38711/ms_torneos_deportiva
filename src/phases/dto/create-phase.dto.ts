import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { PhaseFieldsDto } from './phase-fields.dto';

// Cuerpo de POST /phases. Ejemplos:
// { "tournamentId": 1, "type": "GRUPOS", "name": "Fase de grupos", "qualifiersPerGroup": 2 }
// { "tournamentId": 1, "type": "FINAL", "name": "Cuartos de final", "teamsCount": 8 }
// El orden no se envía: la fase nueva queda de última.
export class CreatePhaseDto extends PhaseFieldsDto {
  @IsNotEmpty({ message: 'El id del torneo es obligatorio' })
  @IsInt({ message: 'El id del torneo debe ser un número entero' })
  @IsPositive({ message: 'El id del torneo debe ser mayor que 0' })
  tournamentId: number;
}
