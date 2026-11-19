import { toSportSummary } from '../sports/sports.mapper';
import {
  TournamentResponseDto,
  TournamentSummaryDto,
} from './dto/tournament-response.dto';
import { Tournament } from './entities/tournament.entity';
import {
  registrationClosedReason,
  tournamentStatus,
} from './tournament-status';

// Entidad → DTO de respuesta. El torneo debe venir con sport y tournamentTeams cargados.
export function toTournamentResponse(
  tournament: Tournament,
): TournamentResponseDto {
  return {
    id: tournament.id,
    name: tournament.name,
    sport: toSportSummary(tournament.sport),
    category: tournament.category,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    registrationDeadline: tournament.registrationDeadline,
    active: tournament.active,
    status: tournamentStatus(tournament),
    registrationOpen: registrationClosedReason(tournament) === null,
    teamsCount: tournament.tournamentTeams?.length ?? 0,
  };
}

// Lo usan las inscripciones (HU-GC-02).
export function toTournamentSummary(
  tournament: Tournament,
): TournamentSummaryDto {
  return {
    id: tournament.id,
    name: tournament.name,
    status: tournamentStatus(tournament),
    active: tournament.active,
  };
}
