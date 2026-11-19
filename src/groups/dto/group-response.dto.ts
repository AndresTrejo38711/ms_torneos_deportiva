import { PhaseSummaryDto } from '../../phases/dto/phase-response.dto';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { TournamentSummaryDto } from '../../tournaments/dto/tournament-response.dto';

// Lo que responde la API: el grupo con su fase, su torneo y los equipos que lo conforman.
export class GroupResponseDto {
  id: number;
  name: string;
  phase: PhaseSummaryDto;
  tournament: TournamentSummaryDto;
  // Ordenados por nombre.
  teams: TeamSummaryDto[];
  teamsCount: number;
}
