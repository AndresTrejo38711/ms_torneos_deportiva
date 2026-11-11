import { PlayerSummaryDto } from '../../players/dto/player-response.dto';
import { SkillSummaryDto } from '../../skills/dto/skill-response.dto';

// Una asignación: el jugador y la habilidad.
export class PlayerSkillResponseDto {
  player: PlayerSummaryDto;
  skill: SkillSummaryDto;
}
