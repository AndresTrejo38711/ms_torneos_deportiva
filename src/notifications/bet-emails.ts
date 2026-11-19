import { BetResponseDto } from '../bets/dto/bet-response.dto';
import {
  oddsOf,
  pesos,
  selectionOf,
  SUBJECT_SUFFIX,
  teamsOf,
  whenOf,
} from './email-format';
import { Email } from './notification.client';

// HU-GC-11: aviso al aficionado de que su apuesta quedó registrada. Solo arma el mensaje. El aviso de
// liquidación va en el resumen del partido (match-emails.ts).
export function betPlacedEmail(bet: BetResponseDto): Email {
  return {
    to: bet.fan.email,
    subject: `Apuesta registrada: ${teamsOf(bet.match)}${SUBJECT_SUFFIX}`,
    message:
      'Hola,\n\n' +
      `Registramos tu apuesta en ${teamsOf(bet.match)} (${bet.match.tournament.name}), ` +
      `el ${whenOf(bet.match.scheduledAt)}:\n` +
      `- ${selectionOf(bet.selection, bet.match)}, ${pesos(bet.amount)} con cuota ${oddsOf(bet.odds)}.\n` +
      `Si aciertas, recibirás ${pesos(bet.potentialPayout)}.\n\n` +
      'Puedes modificarla o cancelarla hasta que empiece el partido.',
  };
}
