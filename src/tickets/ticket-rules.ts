import { randomInt } from 'crypto';
import { nowLocalDateTime } from '../common/persistence/local-date-time.transformer';
import {
  MATCH_STATUS_LABEL,
  MatchStatus,
} from '../matches/entities/match-status.enum';
import { matchLabel } from '../matches/match-label';

// Reglas de la venta de entradas que no hacen consultas (HU-GE-04).

// Por qué un partido no vende boletos hoy, o null si sí vende: debe estar programado, con la venta
// abierta por el administrador y sin haber llegado su hora (la venta se cierra sola a esa hora).
export function saleClosedReason(
  match: {
    status: MatchStatus;
    scheduledAt: string;
    homeTeam: { name: string };
    awayTeam: { name: string };
  },
  open: boolean,
): string | null {
  const label = matchLabel(match);
  if (match.status !== MatchStatus.PROGRAMADO) {
    return `El partido ${label} está ${MATCH_STATUS_LABEL[match.status]}: ya no vende boletos`;
  }
  if (!open) {
    return `La venta de entradas del partido ${label} no está abierta`;
  }
  if (match.scheduledAt <= nowLocalDateTime()) {
    return `Ya llegó la hora del partido ${label}: la venta de entradas se cerró`;
  }
  return null;
}

// Precio de un boleto, en pesos.
export const MIN_TICKET_PRICE = 1000;
export const MAX_TICKET_PRICE = 2000000;

// Boletos de una misma compra.
export const MAX_TICKETS_PER_PURCHASE = 10;

// Minutos que un boleto pendiente de pago aparta su cupo. Después ya no cuenta como vendido: si el
// pago no llegó, el cupo vuelve a la venta.
export const PENDING_HOLD_MINUTES = 15;

// Sin letras ni números que se confundan al leerlos (O y 0, I y 1).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

// "BOL-7F3K9Q2M": lo que se muestra en la entrada del escenario.
export function newTicketCode(): string {
  return `BOL-${randomCode(8)}`;
}

// "TKT-MB3Q1Z0A-7K2P": identifica la compra ante la pasarela de pago.
export function newPaymentReference(): string {
  return `TKT-${Date.now().toString(36).toUpperCase()}-${randomCode(4)}`;
}

// Desde cuándo un boleto pendiente todavía aparta su cupo.
export function holdSince(): Date {
  return new Date(Date.now() - PENDING_HOLD_MINUTES * 60_000);
}
