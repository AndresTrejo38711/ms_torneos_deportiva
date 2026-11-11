// Lo mínimo para mostrar un deporte relacionado (el padre o un subdeporte).
export class SportSummaryDto {
  id: number;
  name: string;
  active: boolean;
}

// Lo que responde la API: nunca la entidad directamente.
export class SportResponseDto {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  parent: SportSummaryDto | null;
  subSports: SportSummaryDto[];
  // Cuántos equipos participan en este deporte (HU-GD-03), para mostrarlo sin otra petición.
  teamsCount: number;
}
