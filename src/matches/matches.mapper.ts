import { toPhaseSummary } from '../phases/phases.mapper';
import { toTeamSummary } from '../teams/teams.mapper';
import { toTournamentSummary } from '../tournaments/tournaments.mapper';
import {
  LiveScoreDto,
  MatchBettingDto,
  MatchGroupDto,
  MatchResponseDto,
  MatchResultDto,
} from './dto/match-response.dto';
import { Match } from './entities/match.entity';

// Entidad → DTO de respuesta. El partido debe venir con phase (y su tournament), homeTeam y
// awayTeam cargados. El grupo y el marcador en vivo no se guardan en el partido: los calcula el
// service (con los equipos y con las anotaciones).
export function toMatchResponse(
  match: Match,
  group: MatchGroupDto | null,
  liveScore: LiveScoreDto,
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
    result: toMatchResult(match),
    liveScore,
    betting: toMatchBetting(match),
  };
}

function toMatchBetting(match: Match): MatchBettingDto | null {
  if (match.homeOdds === null || match.awayOdds === null) {
    return null;
  }
  return {
    homeOdds: match.homeOdds,
    drawOdds: match.drawOdds,
    awayOdds: match.awayOdds,
    open: match.bettingOpen,
  };
}

function toMatchResult(match: Match): MatchResultDto | null {
  if (match.homeScore === null || match.awayScore === null) {
    return null;
  }
  return {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homePenalties: match.homePenalties,
    awayPenalties: match.awayPenalties,
  };
}
