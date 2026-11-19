import { toPhaseSummary } from '../phases/phases.mapper';
import { toTeamSummary } from '../teams/teams.mapper';
import { toTournamentSummary } from '../tournaments/tournaments.mapper';
import { MatchGroupDto, MatchResponseDto } from './dto/match-response.dto';
import { Match } from './entities/match.entity';

// Entidad → DTO de respuesta. El partido debe venir con phase (y su tournament), homeTeam y
// awayTeam cargados. El grupo no se guarda en el partido: lo calcula el service con los equipos.
export function toMatchResponse(
  match: Match,
  group: MatchGroupDto | null,
): MatchResponseDto {
  return {
    id: match.id,
    tournament: toTournamentSummary(match.phase.tournament),
    phase: toPhaseSummary(match.phase),
    group,
    homeTeam: toTeamSummary(match.homeTeam),
    awayTeam: toTeamSummary(match.awayTeam),
    scheduledAt: match.scheduledAt,
    round: match.round,
    bracketPosition: match.bracketPosition,
    status: match.status,
  };
}
