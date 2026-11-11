import { Controller, Get, Param } from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { PlayerProfileDto } from './dto/player-profile.dto';
import { PlayerProfilesService } from './player-profiles.service';

// HU-GD-08 · /api/deportiva/players/{id}/profile
// Comparte el prefijo "players" con PlayersController, pero vive en su propio módulo para no crear
// una dependencia circular (los contratos y las habilidades ya dependen de jugadores).
// Para buscar el jugador se usa GET /players?search=...
@Controller('players')
export class PlayerProfilesController {
  constructor(private readonly playerProfilesService: PlayerProfilesService) {}

  @Get(':id/profile')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<PlayerProfileDto> {
    return this.playerProfilesService.findOne(id);
  }
}
