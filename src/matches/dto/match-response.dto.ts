import { PhaseSummaryDto } from '../../phases/dto/phase-response.dto';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { TournamentSummaryDto } from '../../tournaments/dto/tournament-response.dto';
import { MatchStatus } from '../entities/match-status.enum';

// El grupo en el que se juega un partido de fase de grupos.
export class MatchGroupDto {
  id: number;
  name: string;
}

// Lo que responde la API: nunca la entidad directamente.
export class MatchResponseDto {
  id: number;
  tournament: TournamentSummaryDto;
  // phase.type dice si es de fase de grupos o de fase final (HU-GC-05).
  phase: PhaseSummaryDto;
  // Calculado con los equipos; null en las fases finales.
  group: MatchGroupDto | null;
  homeTeam: TeamSummaryDto;
  awayTeam: TeamSummaryDto;
  scheduledAt: string;
  round: number | null;
  bracketPosition: number | null;
  status: MatchStatus;
}
