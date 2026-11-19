import { toPhaseSummary } from '../phases/phases.mapper';
import { toTeamSummary } from '../teams/teams.mapper';
import { toTournamentSummary } from '../tournaments/tournaments.mapper';
import { GroupResponseDto } from './dto/group-response.dto';
import { Group } from './entities/group.entity';

// Entidad → DTO de respuesta. El grupo debe venir con phase (y su tournament) y con groupTeams
// (y su team) cargados.
export function toGroupResponse(group: Group): GroupResponseDto {
  const teams = (group.groupTeams ?? [])
    .map((row) => toTeamSummary(row.team))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return {
    id: group.id,
    name: group.name,
    phase: toPhaseSummary(group.phase),
    tournament: toTournamentSummary(group.phase.tournament),
    teams,
    teamsCount: teams.length,
  };
}
