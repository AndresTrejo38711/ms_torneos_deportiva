import { MatchResultDto } from '../matches/dto/match-response.dto';
import { BetSelection } from './entities/bet.enums';

// Reglas de las apuestas que no hacen consultas (HU-GC-11).

// Qué selección acierta con un resultado oficial: el que hizo más goles; si empataron, el que ganó
// los penales (fase final) o el empate (fase de grupos).
export function winningSelection(result: MatchResultDto): BetSelection {
  const { homeScore, awayScore, homePenalties, awayPenalties } = result;
  if (homeScore !== awayScore) {
    return homeScore > awayScore ? BetSelection.LOCAL : BetSelection.VISITANTE;
  }
  if (homePenalties === null || awayPenalties === null) {
    return BetSelection.EMPATE;
  }
  return homePenalties > awayPenalties
    ? BetSelection.LOCAL
    : BetSelection.VISITANTE;
}

// valor × cuota, redondeado a centavos.
export function winningPayout(amount: number, odds: number): number {
  return Math.round(amount * odds * 100) / 100;
}
