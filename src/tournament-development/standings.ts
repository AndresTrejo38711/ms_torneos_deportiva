import { MatchResponseDto } from '../matches/dto/match-response.dto';
import { MatchStatus } from '../matches/entities/match-status.enum';
import { TeamSummaryDto } from '../teams/dto/team-response.dto';
import { StandingRowDto } from './dto/tournament-development.dto';

// Puntos de la fase de grupos.
const WIN_POINTS = 3;
const DRAW_POINTS = 1;

// Tabla de posiciones de un grupo. Solo cuentan los partidos finalizados; un equipo sin partidos
// aparece con todo en cero. Desempate: puntos, diferencia, goles a favor y, al final, el nombre.
// No hace consultas: recibe los equipos del grupo y sus partidos.
export function computeStandings(
  teams: TeamSummaryDto[],
  matches: MatchResponseDto[],
  qualifiers: number,
): StandingRowDto[] {
  const rows = new Map<number, StandingRowDto>(
    teams.map((team) => [team.id, emptyRow(team)]),
  );

  for (const match of matches) {
    const home = rows.get(match.homeTeam.id);
    const away = rows.get(match.awayTeam.id);
    if (match.status !== MatchStatus.FINALIZADO || !match.result) {
      continue;
    }
    if (!home || !away) {
      continue;
    }
    addResult(home, match.result.homeScore, match.result.awayScore);
    addResult(away, match.result.awayScore, match.result.homeScore);
  }

  const table = [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.difference - a.difference ||
      b.scoredFor - a.scoredFor ||
      a.team.name.localeCompare(b.team.name, 'es'),
  );
  table.forEach((row, index) => {
    row.position = index + 1;
    row.qualifies = index < qualifiers;
  });
  return table;
}

function emptyRow(team: TeamSummaryDto): StandingRowDto {
  return {
    position: 0,
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    scoredFor: 0,
    scoredAgainst: 0,
    difference: 0,
    points: 0,
    qualifies: false,
  };
}

function addResult(row: StandingRowDto, own: number, other: number): void {
  row.played += 1;
  row.scoredFor += own;
  row.scoredAgainst += other;
  row.difference = row.scoredFor - row.scoredAgainst;
  if (own > other) {
    row.won += 1;
    row.points += WIN_POINTS;
  } else if (own === other) {
    row.drawn += 1;
    row.points += DRAW_POINTS;
  } else {
    row.lost += 1;
  }
}
