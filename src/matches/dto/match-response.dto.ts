import { PhaseSummaryDto } from '../../phases/dto/phase-response.dto';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { TournamentSummaryDto } from '../../tournaments/dto/tournament-response.dto';
import { VenueLocationDto } from '../../venues/dto/venue-response.dto';
import { MatchStatus } from '../entities/match-status.enum';

// El grupo en el que se juega un partido de fase de grupos.
export class MatchGroupDto {
  id: number;
  name: string;
}

// HU-GC-07. Resultado oficial. Los penales llegan en null salvo en una fase final que terminó
// empatada.
export class MatchResultDto {
  homeScore: number;
  awayScore: number;
  homePenalties: number | null;
  awayPenalties: number | null;
}

// HU-GC-07. Lo que suman las anotaciones de cada equipo: el marcador mientras se juega.
export class LiveScoreDto {
  home: number;
  away: number;
}

// HU-GC-11. Las cuotas del partido y si recibe apuestas. drawOdds es null en una fase final.
export class MatchBettingDto {
  homeOdds: number;
  drawOdds: number | null;
  awayOdds: number;
  open: boolean;
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
  // HU-GC-06 (criterio 11) y HU-GE-02: dónde se juega; null si todavía no tiene escenario.
  venue: VenueLocationDto | null;
  status: MatchStatus;
  // null = resultado pendiente (la HU-GC-08 lo usa para separar jugados y pendientes).
  result: MatchResultDto | null;
  liveScore: LiveScoreDto;
  // null mientras el administrador no fije las cuotas.
  betting: MatchBettingDto | null;
}
