import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_HISTORY_PAGE = 500;
export const MAX_HISTORY_PAGE = 1000;

const LIMIT_RANGE = `limit debe ser un número entero entre 1 y ${MAX_HISTORY_PAGE}`;

// Query de GET /tracking/matches/{matchId}/positions: el historial por páginas, en el orden en que
// se registró. La primera página va sin afterId; la siguiente, con el id del último registro recibido.
// Ejemplo: ?afterId=1250&limit=500
export class PositionHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'afterId debe ser un número entero mayor que 0' })
  @Min(1, { message: 'afterId debe ser un número entero mayor que 0' })
  afterId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: LIMIT_RANGE })
  @Min(1, { message: LIMIT_RANGE })
  @Max(MAX_HISTORY_PAGE, { message: LIMIT_RANGE })
  limit?: number;
}
