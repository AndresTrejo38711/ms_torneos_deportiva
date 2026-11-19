import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { ScoreFieldsDto } from './score-fields.dto';

// Cuerpo de POST /scores. Ejemplos:
// { "matchId": 4, "teamId": 3, "playerId": 12, "minute": 37 }
// { "matchId": 9, "teamId": 7, "playerId": 20, "minute": 15, "points": 3 }
export class CreateScoreDto extends ScoreFieldsDto {
  @IsNotEmpty({ message: 'El id del partido es obligatorio' })
  @IsInt({ message: 'El id del partido debe ser un número entero' })
  @IsPositive({ message: 'El id del partido debe ser mayor que 0' })
  matchId: number;
}
