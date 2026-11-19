import { TournamentSummaryDto } from '../../tournaments/dto/tournament-response.dto';
import { PhaseType } from '../entities/phase-type.enum';

// Lo que responde la API: nunca la entidad directamente. Los campos de un tipo de fase llegan en
// null en las fases del otro tipo.
export class PhaseResponseDto {
  id: number;
  tournament: TournamentSummaryDto;
  type: PhaseType;
  name: string;
  order: number;
  // Solo fase de grupos:
  qualifiersPerGroup: number | null;
  groupsCount: number | null;
  // Solo fase final:
  teamsCount: number | null;
}

// Lo mínimo para mostrar una fase relacionada (por ejemplo, la fase de un grupo).
export class PhaseSummaryDto {
  id: number;
  name: string;
  type: PhaseType;
  order: number;
}
