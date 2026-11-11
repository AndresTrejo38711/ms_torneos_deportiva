import { SportSummaryDto } from '../../sports/dto/sport-response.dto';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';

// Una asociación: el equipo y el deporte, cada uno con lo mínimo para mostrarlo.
export class TeamSportResponseDto {
  team: TeamSummaryDto;
  sport: SportSummaryDto;
}
