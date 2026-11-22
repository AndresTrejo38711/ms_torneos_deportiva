import { toLocalDateTime } from '../common/persistence/local-date-time.transformer';
import { toSportSummary } from '../sports/sports.mapper';
import { Team } from '../teams/entities/team.entity';
import {
  AvailableTeamDto,
  FanTeamTeamDto,
  FollowedTeamDto,
  TeamFollowerDto,
} from './dto/fan-team-response.dto';
import { FanTeam } from './entities/fan-team.entity';

// Lo que se carga de un equipo seguido para responderlo.
export const FOLLOWED_RELATIONS = { team: { teamSports: { sport: true } } };

// El equipo debe venir con teamSports.sport cargado.
export function toFanTeamTeam(team: Team): FanTeamTeamDto {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    city: team.city,
    active: team.active,
    sports: (team.teamSports ?? [])
      .map((row) => toSportSummary(row.sport))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
  };
}

export function toAvailableTeam(
  team: Team,
  followed: boolean,
): AvailableTeamDto {
  const { id, name, shortName, city, active, sports } = toFanTeamTeam(team);
  return { id, name, shortName, city, active, sports, followed };
}

// La fila debe venir con FOLLOWED_RELATIONS cargadas.
export function toFollowedTeam(row: FanTeam): FollowedTeamDto {
  return {
    team: toFanTeamTeam(row.team),
    since: toLocalDateTime(row.createdAt),
  };
}

// La fila debe venir con su aficionado cargado.
export function toTeamFollower(row: FanTeam): TeamFollowerDto {
  return {
    fan: { id: row.fan.id, email: row.fan.email },
    since: toLocalDateTime(row.createdAt),
  };
}
