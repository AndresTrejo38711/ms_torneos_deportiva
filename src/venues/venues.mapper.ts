import { Locality } from '../localities/entities/locality.entity';
import {
  VenueLocalityDto,
  VenueLocationDto,
  VenueResponseDto,
  VenueSummaryDto,
} from './dto/venue-response.dto';
import { Venue } from './entities/venue.entity';

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'es');

// Entidad → DTO de respuesta. El escenario debe venir con parent, children y localities cargados.
export function toVenueResponse(venue: Venue): VenueResponseDto {
  const localities = [...(venue.localities ?? [])].sort(byName);
  // Un escenario de adentro está donde está el que lo contiene.
  const { address, city, available } = toVenueLocation(venue);

  return {
    id: venue.id,
    name: venue.name,
    address,
    city,
    description: venue.description,
    photo: venue.photo ?? null,
    active: venue.active,
    available,
    parent: venue.parent ? toVenueSummary(venue.parent) : null,
    children: [...(venue.children ?? [])].sort(byName).map(toVenueSummary),
    localities: localities.map(toVenueLocality),
    capacity: localities
      .filter((locality) => locality.active)
      .reduce((total, locality) => total + locality.capacity, 0),
  };
}

// Dónde queda: lo usan los partidos y los escenarios del torneo (HU-GE-02). El escenario debe venir
// con parent cargado (null si es principal): de ahí salen la dirección y la ciudad de uno de adentro.
export function toVenueLocation(venue: Venue): VenueLocationDto {
  const location = venue.parent ?? venue;
  return {
    id: venue.id,
    name: venue.name,
    parentName: venue.parent?.name ?? null,
    address: location.address ?? '',
    city: location.city ?? '',
    active: venue.active,
    available: venue.active && (venue.parent?.active ?? true),
  };
}

// También lo usan las localidades (HU-GE-03).
export function toVenueSummary(venue: Venue): VenueSummaryDto {
  return { id: venue.id, name: venue.name, active: venue.active };
}

function toVenueLocality(locality: Locality): VenueLocalityDto {
  return {
    id: locality.id,
    name: locality.name,
    capacity: locality.capacity,
    active: locality.active,
  };
}
