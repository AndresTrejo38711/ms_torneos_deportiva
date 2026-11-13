import { PlayerSummaryDto } from '../../players/dto/player-response.dto';
import { SkillSummaryDto } from '../../skills/dto/skill-response.dto';

// Una asignación: el jugador, la habilidad y el nivel (1–100) que tiene en ella.
export class PlayerSkillResponseDto {
  player: PlayerSummaryDto;
  skill: SkillSummaryDto;
  level: number;
}

// Una habilidad vista desde el jugador: la habilidad con el nivel que él tiene. Es lo que traen
// las habilidades de un jugador (HU-GD-07) y su perfil (HU-GD-08).
export class PlayerSkillSummaryDto extends SkillSummaryDto {
  level: number;
}
