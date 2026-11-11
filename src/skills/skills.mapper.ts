import { SkillResponseDto, SkillSummaryDto } from './dto/skill-response.dto';
import { Skill } from './entities/skill.entity';

// Entidad → DTO de respuesta. playerSkills debe venir cargado para contar los jugadores.
export function toSkillResponse(skill: Skill): SkillResponseDto {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    active: skill.active,
    playersCount: skill.playerSkills?.length ?? 0,
  };
}

// También lo usan las habilidades de los jugadores (HU-GD-07) y el perfil (HU-GD-08).
export function toSkillSummary(skill: Skill): SkillSummaryDto {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    active: skill.active,
  };
}
