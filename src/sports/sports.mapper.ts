import { SportResponseDto, SportSummaryDto } from './dto/sport-response.dto';
import { Sport } from './entities/sport.entity';

// Entidad → DTO de respuesta (lo mismo que los Mapper de ms_torneos_security).
export function toSportResponse(sport: Sport): SportResponseDto {
  return {
    id: sport.id,
    name: sport.name,
    description: sport.description,
    active: sport.active,
    parent: sport.parent ? toSportSummary(sport.parent) : null,
    subSports: (sport.subSports ?? []).map(toSportSummary),
  };
}

// También lo usan las asociaciones con equipos (HU-GD-03).
export function toSportSummary(sport: Sport): SportSummaryDto {
  return { id: sport.id, name: sport.name, active: sport.active };
}
