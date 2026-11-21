import { toVenueSummary } from '../venues/venues.mapper';
import { LocalityResponseDto } from './dto/locality-response.dto';
import { Locality } from './entities/locality.entity';

// Entidad → DTO de respuesta. La localidad debe venir con venue cargado.
export function toLocalityResponse(locality: Locality): LocalityResponseDto {
  return {
    id: locality.id,
    name: locality.name,
    capacity: locality.capacity,
    description: locality.description,
    active: locality.active,
    venue: toVenueSummary(locality.venue),
  };
}
