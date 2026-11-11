import { SkillCategory } from '../entities/skill-category.enum';

// Lo mínimo para mostrar una habilidad relacionada: en las habilidades de un jugador (HU-GD-07)
// y en su perfil (HU-GD-08).
export class SkillSummaryDto {
  id: number;
  name: string;
  description: string | null;
  category: SkillCategory;
  active: boolean;
}

// Lo que responde la API: nunca la entidad directamente. El catálogo trae además a cuántos
// jugadores está asignada, para mostrarlo sin hacer una petición por habilidad.
export class SkillResponseDto extends SkillSummaryDto {
  playersCount: number;
}
