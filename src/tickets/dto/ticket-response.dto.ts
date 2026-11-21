import {
  BetFanDto,
  BetPaymentMethodDto,
} from '../../bets/dto/bet-response.dto';
import { MatchResponseDto } from '../../matches/dto/match-response.dto';
import { MatchStatus } from '../../matches/entities/match-status.enum';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { TournamentSummaryDto } from '../../tournaments/dto/tournament-response.dto';
import { VenueLocationDto } from '../../venues/dto/venue-response.dto';
import { TicketStatus } from '../entities/ticket.enums';

// El partido de un boleto, con lo mínimo para mostrarlo y dónde se juega.
export class TicketMatchDto {
  id: number;
  tournament: TournamentSummaryDto;
  homeTeam: TeamSummaryDto;
  awayTeam: TeamSummaryDto;
  scheduledAt: string;
  status: MatchStatus;
  venue: VenueLocationDto | null;
}

export class TicketLocalityDto {
  id: number;
  name: string;
}

// Un boleto: identifica el partido, la localidad y el aficionado (HU-GE-04, criterio 15).
export class TicketResponseDto {
  id: number;
  code: string; // "BOL-7F3K9Q2M"
  status: TicketStatus;
  price: number; // el de la localidad al comprarlo
  reference: string; // la de la compra (la comparten los boletos de una misma compra)
  match: TicketMatchDto;
  locality: TicketLocalityDto;
  fan: BetFanDto;
  paymentMethod: BetPaymentMethodDto;
  // "AAAA-MM-DDTHH:mm", hora local.
  createdAt: string;
  paidAt: string | null;
  closedAt: string | null;
}

// La respuesta de una compra: sus boletos y cómo quedó el pago.
export class TicketPurchaseResponseDto {
  reference: string;
  status: TicketStatus;
  quantity: number;
  unitPrice: number;
  total: number;
  // Con qué pasarela se cobró ("simulada", "ePayco").
  gateway: string;
  // Solo si el pago quedó PENDIENTE: lo que el front necesita para abrir la pasarela (bloque 4).
  checkout: Record<string, unknown> | null;
  tickets: TicketResponseDto[];
}

// Una localidad del escenario en la venta de un partido.
export class TicketingLocalityDto {
  id: number;
  name: string;
  capacity: number;
  active: boolean;
  // null: no se vende en este partido.
  price: number | null;
  // Pagados y pendientes que apartan cupo.
  sold: number;
  available: number;
}

// La venta de entradas de un partido (lo que ve y configura el administrador).
export class MatchTicketingResponseDto {
  matchId: number;
  // Lo que fijó el administrador.
  open: boolean;
  // Si hoy se pueden comprar: abierta, partido programado y sin haber llegado su hora.
  onSale: boolean;
  venue: VenueLocationDto | null;
  // Todas las localidades del escenario, por nombre.
  localities: TicketingLocalityDto[];
}

// Una localidad que se puede comprar.
export class SaleLocalityDto {
  id: number;
  name: string;
  price: number;
  capacity: number;
  available: number;
}

// Un partido con venta de entradas, para el aficionado (HU-GE-04, criterios 5 y 7).
export class TicketSaleMatchDto {
  match: MatchResponseDto;
  // Las que se venden en este partido, por nombre (con available 0 si están agotadas).
  localities: SaleLocalityDto[];
}
