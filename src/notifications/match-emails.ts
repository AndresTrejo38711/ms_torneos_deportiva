import { Bet } from '../bets/entities/bet.entity';
import { BetStatus } from '../bets/entities/bet.enums';
import { MatchResponseDto } from '../matches/dto/match-response.dto';
import { ScoreResponseDto } from '../scores/dto/score-response.dto';
import {
  oddsOf,
  pesos,
  selectionOf,
  SUBJECT_SUFFIX,
  teamsOf,
  whenOf,
} from './email-format';
import { Email } from './notification.client';

// Texto de los correos sobre un partido (HU-GC-06 y HU-GC-07). Solo arman el mensaje: no consultan
// ni envían nada. Los boletos (Anexo 4) se suman a los destinatarios cuando existan.

// HU-GC-06, criterio 13: a quienes apostaron en partidos anteriores de estos equipos.
export function matchCreatedEmails(
  match: MatchResponseDto,
  recipients: string[],
): Email[] {
  const subject = `Nuevo partido: ${teamsOf(match)}${SUBJECT_SUFFIX}`;
  const message =
    'Hola,\n\n' +
    `Se programó un nuevo partido en ${match.tournament.name} (${match.phase.name}): ` +
    `${teamsOf(match)}, el ${whenOf(match.scheduledAt)}.\n\n` +
    'Te escribimos porque apostaste en partidos anteriores de estos equipos.';
  return recipients.map((to) => ({ to, subject, message }));
}

// HU-GC-07, criterio 12: a quienes apostaron en el partido. match ya trae el marcador con esta
// anotación sumada.
export function scoreEmails(
  match: MatchResponseDto,
  score: ScoreResponseDto,
  recipients: string[],
): Email[] {
  const points = score.points > 1 ? ` (${score.points} puntos)` : '';
  const subject = `Anotación en ${teamsOf(match)}${SUBJECT_SUFFIX}`;
  const message =
    'Hola,\n\n' +
    `${score.player.firstName} ${score.player.lastName} anotó para ${score.team.name} en el minuto ` +
    `${score.minute}${points}.\n` +
    `Marcador: ${match.homeTeam.name} ${match.liveScore.home} - ${match.liveScore.away} ${match.awayTeam.name}.\n\n` +
    'Te escribimos porque apostaste en este partido.';
  return recipients.map((to) => ({ to, subject, message }));
}

// HU-GC-07, criterio 13, y HU-GC-11 (aviso de liquidación): un correo por aficionado con el resumen
// del partido y cómo quedaron sus apuestas.
export function resultEmails(match: MatchResponseDto, settled: Bet[]): Email[] {
  const result = match.result;
  if (!result) {
    return [];
  }
  const penalties =
    result.homePenalties !== null && result.awayPenalties !== null
      ? ` (penales ${result.homePenalties}-${result.awayPenalties})`
      : '';
  const summary =
    `Terminó ${teamsOf(match)} (${match.tournament.name}, ${match.phase.name}).\n` +
    `Resultado: ${match.homeTeam.name} ${result.homeScore} - ${result.awayScore} ${match.awayTeam.name}${penalties}.`;
  const subject = `Terminó ${teamsOf(match)}${SUBJECT_SUFFIX}`;

  return groupByFan(settled).map(([to, bets]) => ({
    to,
    subject,
    message:
      `Hola,\n\n${summary}\n\nTus apuestas:\n` +
      bets.map((bet) => `- ${betLine(bet, match)}`).join('\n'),
  }));
}

// HU-GC-11: el partido se canceló y sus apuestas quedaron anuladas.
export function voidedEmails(match: MatchResponseDto, voided: Bet[]): Email[] {
  const subject = `Partido cancelado: ${teamsOf(match)}${SUBJECT_SUFFIX}`;
  return groupByFan(voided).map(([to, bets]) => ({
    to,
    subject,
    message:
      `Hola,\n\nEl partido ${teamsOf(match)} (${match.tournament.name}) fue cancelado. ` +
      'Tus apuestas quedaron anuladas y se te devuelve lo apostado:\n' +
      bets.map((bet) => `- ${betLine(bet, match)}`).join('\n'),
  }));
}

function betLine(bet: Bet, match: MatchResponseDto): string {
  const base = `${selectionOf(bet.selection, match)}, ${pesos(bet.amount)} con cuota ${oddsOf(bet.odds)}`;
  const payout = pesos(bet.payout ?? 0);
  switch (bet.status) {
    case BetStatus.GANADA:
      return `${base}: ganada, se te pagan ${payout}.`;
    case BetStatus.PERDIDA:
      return `${base}: perdida, no hay pago.`;
    default:
      return `${base}: anulada, se te devuelven ${payout}.`;
  }
}

function groupByFan(bets: Bet[]): [string, Bet[]][] {
  const byFan = new Map<string, Bet[]>();
  for (const bet of bets) {
    const list = byFan.get(bet.fan.email) ?? [];
    list.push(bet);
    byFan.set(bet.fan.email, list);
  }
  return [...byFan.entries()];
}
