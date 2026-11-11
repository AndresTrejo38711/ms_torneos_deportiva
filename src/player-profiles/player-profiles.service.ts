import { Injectable } from '@nestjs/common';
import { PlayerSkillsService } from '../player-skills/player-skills.service';
import { PlayersService } from '../players/players.service';
import { ContractStatus } from '../team-players/contract-status';
import { TeamPlayersService } from '../team-players/team-players.service';
import { PlayerProfileDto, ProfileContractDto } from './dto/player-profile.dto';

// Contratos que todavía no se han cerrado: el jugador "se encuentra asociado" a esos equipos.
const OPEN = [ContractStatus.VIGENTE, ContractStatus.FUTURO];

// HU-GD-08 · Consultar perfil deportivo del jugador.
// No guarda nada, así que no tiene entidad ni repository: junta lo que ya responden los services
// de jugadores (HU-GD-04), contratos (HU-GD-05) y habilidades del jugador (HU-GD-07).
@Injectable()
export class PlayerProfilesService {
  constructor(
    private readonly playersService: PlayersService,
    private readonly teamPlayersService: TeamPlayersService,
    private readonly playerSkillsService: PlayerSkillsService,
  ) {}

  async findOne(playerId: number): Promise<PlayerProfileDto> {
    const player = await this.playersService.findOne(playerId); // 404 si no existe
    const contracts = await this.teamPlayersService.findByPlayer(playerId);
    const skills = await this.playerSkillsService.findSkillsByPlayer(playerId);

    // Del contrato completo solo se toma lo que interesa desde el jugador (sin repetir al jugador).
    const toProfileContract = (
      contract: (typeof contracts)[number],
    ): ProfileContractDto => ({
      id: contract.id,
      team: contract.team,
      startDate: contract.startDate,
      endDate: contract.endDate,
      retiredAt: contract.retiredAt,
      status: contract.status,
    });
    const teams = contracts
      .filter((contract) => OPEN.includes(contract.status))
      .map(toProfileContract);
    const teamHistory = contracts
      .filter((contract) => !OPEN.includes(contract.status))
      .map(toProfileContract);

    return {
      player,
      teams,
      teamHistory,
      teamsMessage: teamsMessage(teams.length, teamHistory.length),
      skills,
      skillsMessage:
        skills.length === 0
          ? 'El jugador no tiene habilidades registradas'
          : null,
    };
  }
}

// "Si el jugador no tiene equipos asociados, el sistema debe indicarlo." Si alguna vez tuvo,
// se aclara que es en este momento, porque su historial sí aparece.
function teamsMessage(open: number, history: number): string | null {
  if (open > 0) {
    return null;
  }
  return history > 0
    ? 'El jugador no tiene equipos asociados actualmente'
    : 'El jugador no tiene equipos asociados';
}
