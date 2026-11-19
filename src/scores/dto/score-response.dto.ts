import { PlayerSummaryDto } from '../../players/dto/player-response.dto';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';

// Una anotación: de qué partido, para qué equipo, quién la hizo, en qué minuto y cuánto sumó.
export class ScoreResponseDto {
  id: number;
  matchId: number;
  team: TeamSummaryDto;
  player: PlayerSummaryDto;
  minute: number;
  points: number;
}
