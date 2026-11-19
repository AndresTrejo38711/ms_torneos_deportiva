import { MatchStatus } from '../../matches/entities/match-status.enum';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { TournamentSummaryDto } from '../../tournaments/dto/tournament-response.dto';
import { BetSelection, BetStatus } from '../entities/bet.enums';

// El partido de una apuesta, con lo mínimo para mostrarlo.
export class BetMatchDto {
  id: number;
  tournament: TournamentSummaryDto;
  homeTeam: TeamSummaryDto;
  awayTeam: TeamSummaryDto;
  scheduledAt: string;
  status: MatchStatus;
}

// El método de pago con que se hizo (aunque después se haya desactivado).
export class BetPaymentMethodDto {
  id: number;
  name: string;
  alias: string | null;
  lastFour: string | null;
  phone: string | null;
}

export class BetFanDto {
  id: number;
  email: string;
}

// Una apuesta. El administrador ve el aficionado de cada una (HU-GC-11, criterio 13).
export class BetResponseDto {
  id: number;
  fan: BetFanDto;
  match: BetMatchDto;
  selection: BetSelection;
  amount: number;
  // La del momento de apostar: no cambia.
  odds: number;
  // Lo que recibiría si acierta: valor × cuota.
  potentialPayout: number;
  status: BetStatus;
  // Pagado (ganada), 0 (perdida) o devuelto (anulada o cancelada); null mientras está pendiente.
  payout: number | null;
  // "AAAA-MM-DDTHH:mm", hora local.
  settledAt: string | null;
  paymentMethod: BetPaymentMethodDto;
  createdAt: string;
}
