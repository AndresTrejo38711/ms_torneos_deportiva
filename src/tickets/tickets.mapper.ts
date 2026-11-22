import { toLocalDateTime } from '../common/persistence/local-date-time.transformer';
import { toTeamSummary } from '../teams/teams.mapper';
import { toTournamentSummary } from '../tournaments/tournaments.mapper';
import { toVenueLocation } from '../venues/venues.mapper';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { Ticket } from './entities/ticket.entity';

// Lo que se carga de un boleto para responderlo.
export const TICKET_RELATIONS = {
  fan: true,
  locality: true,
  match: {
    phase: { tournament: true },
    homeTeam: true,
    awayTeam: true,
    venue: { parent: true },
  },
  paymentMethod: { paymentMethod: true },
};

// Entidad → DTO de respuesta. El boleto debe venir con TICKET_RELATIONS cargadas.
export function toTicketResponse(ticket: Ticket): TicketResponseDto {
  const { match, paymentMethod } = ticket;
  return {
    id: ticket.id,
    code: ticket.code,
    status: ticket.status,
    price: ticket.price,
    reference: ticket.paymentReference,
    gatewayReference: ticket.gatewayReference,
    paymentDetail: ticket.paymentDetail,
    match: {
      id: match.id,
      tournament: toTournamentSummary(match.phase.tournament),
      homeTeam: toTeamSummary(match.homeTeam),
      awayTeam: toTeamSummary(match.awayTeam),
      scheduledAt: match.scheduledAt,
      status: match.status,
      venue: match.venue ? toVenueLocation(match.venue) : null,
    },
    locality: { id: ticket.locality.id, name: ticket.locality.name },
    fan: { id: ticket.fan.id, email: ticket.fan.email },
    paymentMethod: {
      id: paymentMethod.id,
      name: paymentMethod.paymentMethod.name,
      alias: paymentMethod.alias,
      lastFour: paymentMethod.lastFour,
      phone: paymentMethod.phone,
    },
    createdAt: toLocalDateTime(ticket.createdAt),
    paidAt: ticket.paidAt ? toLocalDateTime(ticket.paidAt) : null,
    closedAt: ticket.closedAt ? toLocalDateTime(ticket.closedAt) : null,
  };
}
