import { toPlayerSummary } from '../players/players.mapper';
import { toTeamSummary } from '../teams/teams.mapper';
import { ScoreResponseDto } from './dto/score-response.dto';
import { Score } from './entities/score.entity';

// Entidad → DTO de respuesta. La anotación debe venir con match, team y player cargados.
export function toScoreResponse(score: Score): ScoreResponseDto {
  return {
    id: score.id,
    matchId: score.match.id,
    team: toTeamSummary(score.team),
    player: toPlayerSummary(score.player),
    minute: score.minute,
    points: score.points,
  };
}
