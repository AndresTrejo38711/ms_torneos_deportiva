import { SkillResponseDto } from './dto/skill-response.dto';
import { Skill } from './entities/skill.entity';

// Entidad → DTO de respuesta. También lo usan las habilidades de los jugadores (HU-GD-07).
export function toSkillResponse(skill: Skill): SkillResponseDto {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
  };
}
