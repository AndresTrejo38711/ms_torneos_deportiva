import { MatchResponseDto } from '../../matches/dto/match-response.dto';
import { PhaseSummaryDto } from '../../phases/dto/phase-response.dto';
import { PhaseType } from '../../phases/entities/phase-type.enum';
import { ScoreResponseDto } from '../../scores/dto/score-response.dto';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { TournamentResponseDto } from '../../tournaments/dto/tournament-response.dto';

// HU-GC-08. Todo lo que muestra la pantalla "Desarrollo del Torneo", en una sola respuesta.

// Un partido con sus anotaciones (las de las tarjetas y el detalle del mockup).
export class DevelopmentMatchDto extends MatchResponseDto {
  scores: ScoreResponseDto[];
}

// Una fila de la tabla de posiciones de un grupo.
export class StandingRowDto {
  position: number;
  team: TeamSummaryDto;
  played: number; // PJ
  won: number; // PG
  drawn: number; // PE
  lost: number; // PP
  scoredFor: number; // GF
  scoredAgainst: number; // GC
  difference: number; // DG
  points: number; // PTS
  // Está en los puestos que clasifican (los "clasificados por grupo" de la fase).
  qualifies: boolean;
}

export class GroupStandingsDto {
  id: number;
  name: string;
  standings: StandingRowDto[];
}

// Una posición de la llave de una fase final: su partido (null si todavía no se programa) y, si ya
// finalizó, quién ganó.
export class BracketSlotDto {
  position: number;
  match: DevelopmentMatchDto | null;
  winner: TeamSummaryDto | null;
}

export class PhaseDevelopmentDto {
  id: number;
  name: string;
  type: PhaseType;
  order: number;
  qualifiersPerGroup: number | null;
  teamsCount: number | null;
  // Cuántos partidos de la fase ya tienen resultado, cuántos faltan y cuántos se cancelaron.
  finished: number;
  pending: number;
  cancelled: number;
  // Solo en fase de grupos (null en las finales).
  groups: GroupStandingsDto[] | null;
  // Solo en fase final (null en las de grupos).
  bracket: BracketSlotDto[] | null;
  // Por fecha.
  matches: DevelopmentMatchDto[];
}

// El panel "Estado de la competencia". Los partidos cancelados no cuentan en matches ni en el
// porcentaje: van aparte.
export class DevelopmentSummaryDto {
  teams: number;
  matches: number;
  finished: number;
  pending: number;
  cancelled: number;
  // Porcentaje de partidos finalizados (0 a 100, entero).
  progress: number;
  currentPhase: PhaseSummaryDto | null;
  activeTeams: number;
  eliminatedTeams: number;
  // Suma de los marcadores oficiales (goles en fútbol, puntos en baloncesto).
  totalScored: number;
}

export class TournamentDevelopmentDto {
  tournament: TournamentResponseDto;
  summary: DevelopmentSummaryDto;
  phases: PhaseDevelopmentDto[];
}
