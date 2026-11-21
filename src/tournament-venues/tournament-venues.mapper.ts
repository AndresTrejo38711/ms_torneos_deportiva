import { toTournamentSummary } from '../tournaments/tournaments.mapper';
import { toVenueLocation } from '../venues/venues.mapper';
import { TournamentVenueResponseDto } from './dto/tournament-venue-response.dto';
import { TournamentVenue } from './entities/tournament-venue.entity';

// Entidad → DTO de respuesta. Necesita la fila con tournament y venue (y el parent del escenario)
// cargados.
export function toTournamentVenueResponse(
  tournamentVenue: TournamentVenue,
): TournamentVenueResponseDto {
  return {
    id: tournamentVenue.id,
    tournament: toTournamentSummary(tournamentVenue.tournament),
    venue: toVenueLocation(tournamentVenue.venue),
  };
}
