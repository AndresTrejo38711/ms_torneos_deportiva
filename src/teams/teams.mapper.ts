import { toSportSummary } from '../sports/sports.mapper';
import {
  ContractStatus,
  contractStatus,
} from '../team-players/contract-status';
import { TeamResponseDto, TeamSummaryDto } from './dto/team-response.dto';
import { Team } from './entities/team.entity';

// Entidad → DTO de respuesta. Para el resumen, el equipo debe venir con teamSports (y su sport)
// y teamPlayers (y su player) cargados.
export function toTeamResponse(team: Team): TeamResponseDto {
  const sports = (team.teamSports ?? [])
    .map((row) => toSportSummary(row.sport))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  // Solo cuentan los contratos vigentes hoy. El Set evita contar dos veces al mismo jugador.
  const currentPlayers = new Set(
    (team.teamPlayers ?? [])
      .filter((contract) => contractStatus(contract) === ContractStatus.VIGENTE)
      .map((contract) => contract.player.id),
  );

  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    city: team.city,
    description: team.description,
    foundationDate: team.foundationDate,
    active: team.active,
    sports,
    playersCount: currentPlayers.size,
  };
}

// Lo usan las asociaciones con deportes (HU-GD-03).
export function toTeamSummary(team: Team): TeamSummaryDto {
  return { id: team.id, name: team.name, active: team.active };
}
