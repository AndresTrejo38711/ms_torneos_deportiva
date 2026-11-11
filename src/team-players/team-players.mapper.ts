import { toPlayerSummary } from '../players/players.mapper';
import { toTeamSummary } from '../teams/teams.mapper';
import { contractStatus } from './contract-status';
import { TeamPlayerResponseDto } from './dto/team-player-response.dto';
import { TeamPlayer } from './entities/team-player.entity';

// Entidad → DTO de respuesta. Necesita que la fila venga con team y player cargados.
export function toTeamPlayerResponse(
  contract: TeamPlayer,
): TeamPlayerResponseDto {
  return {
    id: contract.id,
    team: toTeamSummary(contract.team),
    player: toPlayerSummary(contract.player),
    startDate: contract.startDate,
    endDate: contract.endDate,
    retiredAt: contract.retiredAt,
    status: contractStatus(contract),
  };
}
