import {
  ContractStatus,
  contractStatus,
} from '../team-players/contract-status';
import { TeamSummaryDto } from '../teams/dto/team-response.dto';
import { toTeamSummary } from '../teams/teams.mapper';
import { PlayerResponseDto, PlayerSummaryDto } from './dto/player-response.dto';
import { Player } from './entities/player.entity';

// Entidad → DTO de respuesta. Para currentTeams, el jugador debe venir con teamPlayers (y su
// team) cargados; para la foto, con addSelect('player.photo').
export function toPlayerResponse(player: Player): PlayerResponseDto {
  // Solo los contratos vigentes hoy. El Map evita repetir un equipo.
  const currentTeams = new Map<number, TeamSummaryDto>();
  for (const contract of player.teamPlayers ?? []) {
    if (contractStatus(contract) === ContractStatus.VIGENTE) {
      currentTeams.set(contract.team.id, toTeamSummary(contract.team));
    }
  }

  return {
    id: player.id,
    documentType: player.documentType,
    documentNumber: player.documentNumber,
    firstName: player.firstName,
    lastName: player.lastName,
    birthDate: player.birthDate,
    position: player.position,
    nationality: player.nationality,
    heightCm: player.heightCm,
    dominantFoot: player.dominantFoot,
    photo: player.photo ?? null,
    active: player.active,
    currentTeams: [...currentTeams.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'es'),
    ),
  };
}

// Lo usan los contratos con equipos (HU-GD-05).
export function toPlayerSummary(player: Player): PlayerSummaryDto {
  return {
    id: player.id,
    documentType: player.documentType,
    documentNumber: player.documentNumber,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    active: player.active,
  };
}
