import { TournamentSummaryDto } from '../../tournaments/dto/tournament-response.dto';
import { VenueLocationDto } from '../../venues/dto/venue-response.dto';

// Una asignación: el torneo y el escenario, con dónde queda.
export class TournamentVenueResponseDto {
  id: number;
  tournament: TournamentSummaryDto;
  venue: VenueLocationDto;
}
