import { MatchResponseDto } from '../matches/dto/match-response.dto';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketPurchaseResponseDto } from '../tickets/dto/ticket-response.dto';
import { pesos, SUBJECT_SUFFIX, teamsOf, whenOf } from './email-format';
import { Email } from './notification.client';

// Texto de los correos de la venta de entradas (HU-GE-04). Solo arman el mensaje: no consultan ni
// envían nada.

// "Coliseo Mayor (Cancha de tenis), Calle 10 # 5-20, Manizales".
function placeOf(venue: {
  name: string;
  parentName: string | null;
  address: string;
  city: string;
}): string {
  const name = venue.parentName
    ? `${venue.parentName} (${venue.name})`
    : venue.name;
  return `${name}, ${venue.address}, ${venue.city}`;
}

// Confirmación de la compra (criterio 16): el partido, dónde y cuándo, la localidad y los códigos.
export function ticketsPurchasedEmail(
  purchase: TicketPurchaseResponseDto,
): Email | null {
  const [first] = purchase.tickets;
  if (!first) {
    return null;
  }
  const { match } = first;
  const place = match.venue ? `\nEscenario: ${placeOf(match.venue)}.` : '';
  const plural =
    purchase.quantity === 1 ? 'tu boleto' : `tus ${purchase.quantity} boletos`;
  return {
    to: first.fan.email,
    subject: `Boletos confirmados: ${teamsOf(match)}${SUBJECT_SUFFIX}`,
    message:
      'Hola,\n\n' +
      `Confirmamos ${plural} para ${teamsOf(match)} (${match.tournament.name}), ` +
      `el ${whenOf(match.scheduledAt)}.${place}\n` +
      `Localidad: ${first.locality.name}. Total pagado: ${pesos(purchase.total)} ` +
      `(referencia ${purchase.reference}).\n\n` +
      'Códigos para entrar:\n' +
      purchase.tickets.map((ticket) => `- ${ticket.code}`).join('\n'),
  };
}

// El pago se aprobó tarde (la reserva de los boletos ya había vencido) y la compra no se pudo
// cumplir: los boletos quedaron anulados y se devuelve lo pagado. purchase.detail dice por qué.
export function lateTicketsVoidedEmail(
  purchase: TicketPurchaseResponseDto,
): Email | null {
  const [first] = purchase.tickets;
  if (!first) {
    return null;
  }
  const { match } = first;
  return {
    to: first.fan.email,
    subject: `Compra anulada: ${teamsOf(match)}${SUBJECT_SUFFIX}`,
    message:
      'Hola,\n\n' +
      `Tu pago de ${pesos(purchase.total)} (referencia ${purchase.reference}) para ` +
      `${teamsOf(match)} (${match.tournament.name}) se aprobó, pero la compra quedó anulada.\n\n` +
      (purchase.detail ?? 'Se te devuelve lo pagado.'),
  };
}

// El partido se canceló: los boletos quedaron anulados y se devuelve lo pagado. Un correo por
// aficionado.
export function voidedTicketEmails(
  match: MatchResponseDto,
  voided: Ticket[],
): Email[] {
  const byFan = new Map<string, Ticket[]>();
  for (const ticket of voided) {
    const list = byFan.get(ticket.fan.email) ?? [];
    list.push(ticket);
    byFan.set(ticket.fan.email, list);
  }
  const subject = `Partido cancelado: ${teamsOf(match)}${SUBJECT_SUFFIX}`;
  return [...byFan.entries()].map(([to, tickets]) => ({
    to,
    subject,
    message:
      `Hola,\n\nEl partido ${teamsOf(match)} (${match.tournament.name}) fue cancelado. ` +
      'Tus boletos quedaron anulados y se te devuelve lo pagado:\n' +
      tickets
        .map(
          (ticket) =>
            `- ${ticket.code}, ${ticket.locality.name}: ${pesos(ticket.price)}`,
        )
        .join('\n'),
  }));
}
