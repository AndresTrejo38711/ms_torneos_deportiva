// Lo que responde la API: nunca la entidad directamente.
export class TeamResponseDto {
  id: number;
  name: string;
  city: string;
  foundationDate: string | null;
  active: boolean;
}

// Lo mínimo para mostrar un equipo relacionado (por ejemplo, los equipos de un deporte).
export class TeamSummaryDto {
  id: number;
  name: string;
  active: boolean;
}
