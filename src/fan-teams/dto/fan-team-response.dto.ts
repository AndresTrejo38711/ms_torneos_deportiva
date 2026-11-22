import { BetFanDto } from '../../bets/dto/bet-response.dto';
import { SportSummaryDto } from '../../sports/dto/sport-response.dto';

// Un equipo como lo ve el aficionado: lo necesario para reconocerlo, con sus deportes por nombre.
export class FanTeamTeamDto {
  id: number;
  name: string;
  shortName: string | null;
  city: string;
  active: boolean;
  sports: SportSummaryDto[];
}

// Un equipo que el aficionado puede seguir (criterio 3).
export class AvailableTeamDto extends FanTeamTeamDto {
  // Si ya lo sigue.
  followed: boolean;
}

// Un equipo que el aficionado sigue (criterio 7).
export class FollowedTeamDto {
  team: FanTeamTeamDto;
  // Desde cuándo lo sigue: "AAAA-MM-DDTHH:mm", hora local.
  since: string;
}

// Un aficionado que sigue a un equipo, para el administrador (criterio 8).
export class TeamFollowerDto {
  fan: BetFanDto;
  since: string;
}
