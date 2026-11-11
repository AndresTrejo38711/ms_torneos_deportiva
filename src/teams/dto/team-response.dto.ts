import { SportSummaryDto } from '../../sports/dto/sport-response.dto';

// Lo que responde la API: nunca la entidad directamente.
export class TeamResponseDto {
  id: number;
  name: string;
  shortName: string | null;
  city: string;
  description: string | null;
  foundationDate: string | null;
  active: boolean;
  // Resumen para las listas, sin otra petición por equipo:
  // sus deportes (HU-GD-03), ordenados por nombre...
  sports: SportSummaryDto[];
  // ...y cuántos jugadores tiene hoy, es decir, con contrato vigente (HU-GD-05).
  playersCount: number;
}

// Lo mínimo para mostrar un equipo relacionado (por ejemplo, los equipos de un deporte).
export class TeamSummaryDto {
  id: number;
  name: string;
  active: boolean;
}
