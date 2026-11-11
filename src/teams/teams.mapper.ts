import { TeamResponseDto, TeamSummaryDto } from './dto/team-response.dto';
import { Team } from './entities/team.entity';

// Entidad → DTO de respuesta.
export function toTeamResponse(team: Team): TeamResponseDto {
  return {
    id: team.id,
    name: team.name,
    city: team.city,
    foundationDate: team.foundationDate,
    active: team.active,
  };
}

// Lo usan las asociaciones con deportes (HU-GD-03).
export function toTeamSummary(team: Team): TeamSummaryDto {
  return { id: team.id, name: team.name, active: team.active };
}
