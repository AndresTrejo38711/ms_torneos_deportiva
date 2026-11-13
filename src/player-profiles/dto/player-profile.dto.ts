import { PlayerResponseDto } from '../../players/dto/player-response.dto';
import { PlayerSkillSummaryDto } from '../../player-skills/dto/player-skill-response.dto';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { ContractStatus } from '../../team-players/contract-status';

// Un contrato visto desde el jugador: el equipo, las fechas y el estado.
export class ProfileContractDto {
  id: number;
  team: TeamSummaryDto;
  startDate: string;
  endDate: string;
  retiredAt: string | null;
  status: ContractStatus;
}

// HU-GD-08. Todo lo del jugador en una sola respuesta.
export class PlayerProfileDto {
  player: PlayerResponseDto;
  // Equipos con los que está asociado: contratos vigentes y futuros.
  teams: ProfileContractDto[];
  // Historial de traspasos: contratos finalizados y retirados.
  teamHistory: ProfileContractDto[];
  // Mensaje para mostrar cuando no tiene equipos asociados; null si sí tiene.
  teamsMessage: string | null;
  // Sus habilidades, cada una con el nivel (1–100) que tiene en ella.
  skills: PlayerSkillSummaryDto[];
  // Mensaje para mostrar cuando no tiene habilidades; null si sí tiene.
  skillsMessage: string | null;
}
