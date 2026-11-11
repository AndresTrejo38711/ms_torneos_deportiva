import { PlayerSummaryDto } from '../../players/dto/player-response.dto';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { ContractStatus } from '../contract-status';

// Un contrato: quién, con qué equipo, sus fechas y el estado calculado.
export class TeamPlayerResponseDto {
  id: number;
  team: TeamSummaryDto;
  player: PlayerSummaryDto;
  startDate: string;
  endDate: string;
  retiredAt: string | null;
  status: ContractStatus;
}
