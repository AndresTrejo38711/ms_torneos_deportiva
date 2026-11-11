import { PlayerResponseDto, PlayerSummaryDto } from './dto/player-response.dto';
import { Player } from './entities/player.entity';

// Entidad → DTO de respuesta.
export function toPlayerResponse(player: Player): PlayerResponseDto {
  return {
    id: player.id,
    documentType: player.documentType,
    documentNumber: player.documentNumber,
    firstName: player.firstName,
    lastName: player.lastName,
    birthDate: player.birthDate,
    active: player.active,
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
    active: player.active,
  };
}
