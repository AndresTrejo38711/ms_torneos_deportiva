import { MatchStatus } from '../matches/entities/match-status.enum';
import { PhaseSummaryDto } from '../phases/dto/phase-response.dto';
import { PhaseType } from '../phases/entities/phase-type.enum';
import { matchLoser } from './bracket';
import {
  DevelopmentMatchDto,
  DevelopmentSummaryDto,
  PhaseDevelopmentDto,
} from './dto/tournament-development.dto';

type StatusCounts = { finished: number; pending: number; cancelled: number };

// Cuántos partidos ya finalizaron, cuántos faltan (programados o en juego) y cuántos se cancelaron.
export function countByStatus(matches: DevelopmentMatchDto[]): StatusCounts {
  const counts: StatusCounts = { finished: 0, pending: 0, cancelled: 0 };
  for (const match of matches) {
    if (match.status === MatchStatus.FINALIZADO) {
      counts.finished += 1;
    } else if (match.status === MatchStatus.CANCELADO) {
      counts.cancelled += 1;
    } else {
      counts.pending += 1;
    }
  }
  return counts;
}

// El panel "Estado de la competencia", a partir de las fases ya armadas. No hace consultas.
export function summarize(
  teams: number,
  phases: PhaseDevelopmentDto[],
): DevelopmentSummaryDto {
  const finished = sum(phases, (phase) => phase.finished);
  const pending = sum(phases, (phase) => phase.pending);
  const cancelled = sum(phases, (phase) => phase.cancelled);
  const matches = finished + pending;
  const eliminated = eliminatedTeams(phases);

  return {
    teams,
    matches,
    finished,
    pending,
    cancelled,
    progress: matches === 0 ? 0 : Math.round((finished * 100) / matches),
    currentPhase: currentPhase(phases),
    activeTeams: teams - eliminated.size,
    eliminatedTeams: eliminated.size,
    totalScored: sum(phases, (phase) =>
      sum(phase.matches, (match) =>
        match.result ? match.result.homeScore + match.result.awayScore : 0,
      ),
    ),
  };
}

// La primera fase, en orden, con partidos pendientes. Si no hay pendientes, la última que tenga
// partidos. null si el torneo todavía no tiene partidos.
function currentPhase(phases: PhaseDevelopmentDto[]): PhaseSummaryDto | null {
  const phase =
    phases.find((candidate) => candidate.pending > 0) ??
    phases.findLast((candidate) => candidate.finished > 0);
  if (!phase) {
    return null;
  }
  return {
    id: phase.id,
    name: phase.name,
    type: phase.type,
    order: phase.order,
  };
}

// Quien perdió un partido finalizado de una fase final y, en una fase de grupos ya terminada (con
// partidos y todos finalizados), quien quedó fuera de los puestos que clasifican.
function eliminatedTeams(phases: PhaseDevelopmentDto[]): Set<number> {
  const eliminated = new Set<number>();
  for (const phase of phases) {
    if (phase.type === PhaseType.FINAL) {
      for (const match of phase.matches) {
        const loser = matchLoser(match);
        if (loser) {
          eliminated.add(loser.id);
        }
      }
    } else if (phase.finished > 0 && phase.pending === 0) {
      for (const group of phase.groups ?? []) {
        for (const row of group.standings) {
          if (!row.qualifies) {
            eliminated.add(row.team.id);
          }
        }
      }
    }
  }
  return eliminated;
}

function sum<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}
