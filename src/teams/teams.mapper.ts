import { TeamResponseDto } from './dto/team-response.dto';
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
