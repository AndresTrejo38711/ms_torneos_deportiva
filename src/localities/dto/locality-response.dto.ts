import { VenueSummaryDto } from '../../venues/dto/venue-response.dto';

// Lo que responde la API: la localidad con su escenario.
export class LocalityResponseDto {
  id: number;
  name: string;
  capacity: number;
  description: string | null;
  active: boolean;
  venue: VenueSummaryDto;
}
