import { toLocalDateTime } from '../common/persistence/local-date-time.transformer';
import { toTeamSummary } from '../teams/teams.mapper';
import { toTournamentSummary } from '../tournaments/tournaments.mapper';
import { winningPayout } from './bet-rules';
import { BetResponseDto } from './dto/bet-response.dto';
import { Bet } from './entities/bet.entity';

// Entidad → DTO de respuesta. La apuesta debe venir con fan, match (phase.tournament, homeTeam y
// awayTeam) y paymentMethod (con su paymentMethod del catálogo) cargados.
export function toBetResponse(bet: Bet): BetResponseDto {
  const { match, paymentMethod } = bet;
  return {
    id: bet.id,
    fan: { id: bet.fan.id, email: bet.fan.email },
    match: {
      id: match.id,
      tournament: toTournamentSummary(match.phase.tournament),
      homeTeam: toTeamSummary(match.homeTeam),
      awayTeam: toTeamSummary(match.awayTeam),
      scheduledAt: match.scheduledAt,
      status: match.status,
    },
    selection: bet.selection,
    amount: bet.amount,
    odds: bet.odds,
    potentialPayout: winningPayout(bet.amount, bet.odds),
    status: bet.status,
    payout: bet.payout,
    settledAt: bet.settledAt ? toLocalDateTime(bet.settledAt) : null,
    paymentMethod: {
      id: paymentMethod.id,
      name: paymentMethod.paymentMethod.name,
      alias: paymentMethod.alias,
      lastFour: paymentMethod.lastFour,
      phone: paymentMethod.phone,
    },
    createdAt: toLocalDateTime(bet.createdAt),
  };
}
