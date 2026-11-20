import { SportSummaryDto } from '../../sports/dto/sport-response.dto';
import { TournamentCategory } from '../entities/tournament-category.enum';
import { TournamentStatus } from '../tournament-status';

// Lo que responde la API: nunca la entidad directamente.
export class TournamentResponseDto {
  id: number;
  name: string;
  sport: SportSummaryDto;
  category: TournamentCategory;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  logo: string | null; // "data:image/webp;base64,..." o null si no tiene
  active: boolean;
  // Calculados con las fechas de hoy (tournament-status.ts):
  status: TournamentStatus;
  // Si hoy se pueden inscribir o retirar equipos...
  registrationOpen: boolean;
  // ...y cuántos hay inscritos (HU-GC-02), para mostrarlo sin otra petición.
  teamsCount: number;
}

// Lo mínimo para mostrar un torneo relacionado (por ejemplo, los torneos de un equipo). No lleva el
// logo: se repetiría en cada inscripción; el front lo toma de la lista de torneos.
export class TournamentSummaryDto {
  id: number;
  name: string;
  status: TournamentStatus;
  active: boolean;
}
