import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { TournamentSummaryDto } from '../../tournaments/dto/tournament-response.dto';

// Una inscripción: el torneo y el equipo, cada uno con lo mínimo para mostrarlo, y el día en que
// se inscribió.
export class TournamentTeamResponseDto {
  id: number;
  tournament: TournamentSummaryDto;
  team: TeamSummaryDto;
  registeredAt: string;
}
