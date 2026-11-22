import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

// Si no se da nombre, la pelota se llama así.
export const DEFAULT_BALL_NAME = 'Balón del partido';

// Cuerpo (opcional) de PATCH /tracking/matches/{matchId}/start. Ejemplos: {} o
// { "ballName": "Balón oficial Golty" }. El nombre solo se usa la primera vez, cuando se crea la
// pelota del partido; al reanudar una pausa se ignora.
export class StartTrackingDto {
  @IsOptional()
  @Trim()
  @IsString({ message: 'El nombre de la pelota debe ser texto' })
  @MaxLength(60, {
    message: 'El nombre de la pelota debe tener máximo 60 caracteres',
  })
  ballName?: string | null;
}
