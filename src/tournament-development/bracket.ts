import { MatchResponseDto } from '../matches/dto/match-response.dto';
import { MatchStatus } from '../matches/entities/match-status.enum';
import { TeamSummaryDto } from '../teams/dto/team-response.dto';
import {
  BracketSlotDto,
  DevelopmentMatchDto,
} from './dto/tournament-development.dto';

// Quién ganó un partido finalizado: el de mayor marcador o, si empataron, el de más penales.
// null si no ha terminado o si quedó en empate (solo pasa en la fase de grupos).
export function matchWinner(match: MatchResponseDto): TeamSummaryDto | null {
  const { result } = match;
  if (match.status !== MatchStatus.FINALIZADO || !result) {
    return null;
  }
  if (result.homeScore !== result.awayScore) {
    return result.homeScore > result.awayScore
      ? match.homeTeam
      : match.awayTeam;
  }
  if (result.homePenalties === null || result.awayPenalties === null) {
    return null;
  }
  return result.homePenalties > result.awayPenalties
    ? match.homeTeam
    : match.awayTeam;
}

// El que perdió un partido que tiene ganador.
export function matchLoser(match: MatchResponseDto): TeamSummaryDto | null {
  const winner = matchWinner(match);
  if (!winner) {
    return null;
  }
  return winner.id === match.homeTeam.id ? match.awayTeam : match.homeTeam;
}

// La llave de una fase final: una posición por cada partido que le cabe (la mitad de sus equipos),
// con el partido que la ocupa o null si todavía no se programa. No hace consultas.
export function buildBracket(
  teamsCount: number,
  matches: DevelopmentMatchDto[],
): BracketSlotDto[] {
  const slots = Math.floor(teamsCount / 2);
  return Array.from({ length: slots }, (_, index) => {
    const position = index + 1;
    const match =
      matches.find((game) => game.bracketPosition === position) ?? null;
    return { position, match, winner: match ? matchWinner(match) : null };
  });
}
