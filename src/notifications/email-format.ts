import { BetSelection } from '../bets/entities/bet.enums';

// Piezas comunes del texto de los correos.

// "Leones vs Morsas".
export function teamsOf(match: {
  homeTeam: { name: string };
  awayTeam: { name: string };
}): string {
  return `${match.homeTeam.name} vs ${match.awayTeam.name}`;
}

// "2030-03-01T18:00" → "01/03/2030 a las 18:00".
export function whenOf(scheduledAt: string): string {
  const [date, time] = scheduledAt.split('T');
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year} a las ${time}`;
}

// "$10.000" o "$18.500,5".
export function pesos(value: number): string {
  return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;
}

// "1,80".
export function oddsOf(value: number): string {
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// "gana Leones", "empate".
export function selectionOf(
  selection: BetSelection,
  match: { homeTeam: { name: string }; awayTeam: { name: string } },
): string {
  if (selection === BetSelection.LOCAL) {
    return `gana ${match.homeTeam.name}`;
  }
  if (selection === BetSelection.VISITANTE) {
    return `gana ${match.awayTeam.name}`;
  }
  return 'empate';
}

export const SUBJECT_SUFFIX = ' - Torneos';
