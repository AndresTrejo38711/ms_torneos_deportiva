// Lo que responde la API: nunca la entidad directamente.
export class TeamResponseDto {
  id: number;
  name: string;
  city: string;
  foundationDate: string | null;
  active: boolean;
}
