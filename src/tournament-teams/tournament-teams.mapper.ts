import { toTeamSummary } from '../teams/teams.mapper';
import { toTournamentSummary } from '../tournaments/tournaments.mapper';
import { TournamentTeamResponseDto } from './dto/tournament-team-response.dto';
import { TournamentTeam } from './entities/tournament-team.entity';

// Entidad → DTO de respuesta. Necesita que la fila venga con tournament y team cargados.
export function toTournamentTeamResponse(
  tournamentTeam: TournamentTeam,
): TournamentTeamResponseDto {
  return {
    id: tournamentTeam.id,
    tournament: toTournamentSummary(tournamentTeam.tournament),
    team: toTeamSummary(tournamentTeam.team),
    registeredAt: tournamentTeam.registeredAt,
  };
}
