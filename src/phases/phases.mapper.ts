import { toTournamentSummary } from '../tournaments/tournaments.mapper';
import { PhaseResponseDto, PhaseSummaryDto } from './dto/phase-response.dto';
import { Phase } from './entities/phase.entity';
import { isFinalPhase, isGroupPhase, phaseTypeOf } from './phase-kind';

// Entidad → DTO de respuesta. La fase debe venir con su torneo y, si es de grupos, con sus grupos.
export function toPhaseResponse(phase: Phase): PhaseResponseDto {
  return {
    id: phase.id,
    tournament: toTournamentSummary(phase.tournament),
    type: phaseTypeOf(phase),
    name: phase.name,
    order: phase.order,
    qualifiersPerGroup: isGroupPhase(phase) ? phase.qualifiersPerGroup : null,
    groupsCount: isGroupPhase(phase) ? (phase.groups?.length ?? 0) : null,
    teamsCount: isFinalPhase(phase) ? phase.teamsCount : null,
  };
}

// Lo usan los grupos (HU-GC-04).
export function toPhaseSummary(phase: Phase): PhaseSummaryDto {
  return {
    id: phase.id,
    name: phase.name,
    type: phaseTypeOf(phase),
    order: phase.order,
  };
}
