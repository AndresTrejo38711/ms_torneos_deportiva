// Lo mínimo para mostrar un escenario relacionado (el que contiene a otro, uno de adentro, el de
// una localidad). No lleva la foto: se repetiría en cada fila; el front la toma de la lista.
export class VenueSummaryDto {
  id: number;
  name: string;
  active: boolean;
}

// Dónde queda un escenario, para mostrarlo dentro de otra respuesta (el escenario de un partido, los
// escenarios de un torneo). Un escenario de adentro trae el nombre del que lo contiene y su ubicación.
export class VenueLocationDto {
  id: number;
  name: string;
  parentName: string | null; // "Coliseo Mayor" si es una cancha de adentro; null si es principal
  address: string;
  city: string;
  active: boolean;
  available: boolean;
}

// Una localidad dentro de la respuesta del escenario (HU-GE-03).
export class VenueLocalityDto {
  id: number;
  name: string;
  capacity: number;
  active: boolean;
}

// Lo que responde la API: nunca la entidad directamente.
export class VenueResponseDto {
  id: number;
  name: string;
  // Las suyas o, si está dentro de otro escenario, las de ese.
  address: string;
  city: string;
  description: string | null;
  photo: string | null; // "data:image/webp;base64,..." o null si no tiene
  active: boolean;
  // Se puede usar: está activo y, si está dentro de otro, ese también lo está.
  available: boolean;
  parent: VenueSummaryDto | null;
  // Los escenarios de adentro, ordenados por nombre.
  children: VenueSummaryDto[];
  // Sus localidades, ordenadas por nombre.
  localities: VenueLocalityDto[];
  // Suma de la capacidad de sus localidades activas. Se calcula: no se guarda.
  capacity: number;
}
