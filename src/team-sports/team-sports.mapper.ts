import { toSportSummary } from '../sports/sports.mapper';
import { toTeamSummary } from '../teams/teams.mapper';
import { TeamSportResponseDto } from './dto/team-sport-response.dto';
import { TeamSport } from './entities/team-sport.entity';

// Entidad → DTO de respuesta. Necesita que la fila venga con team y sport cargados.
export function toTeamSportResponse(
  teamSport: TeamSport,
): TeamSportResponseDto {
  return {
    team: toTeamSummary(teamSport.team),
    sport: toSportSummary(teamSport.sport),
  };
}
