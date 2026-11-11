import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { today } from '../common/validation/date.validators';
import { PlayersService } from '../players/players.service';
import { TeamsService } from '../teams/teams.service';
import {
  ContractStatus,
  contractStatus,
  effectiveEndDate,
  overlaps,
} from './contract-status';
import { CreateTeamPlayerDto } from './dto/create-team-player.dto';
import { TeamPlayerResponseDto } from './dto/team-player-response.dto';
import { TeamPlayer } from './entities/team-player.entity';
import { toTeamPlayerResponse } from './team-players.mapper';

// HU-GD-05 · Asignar jugadores a equipos (contratos).
@Injectable()
export class TeamPlayersService {
  constructor(
    @InjectRepository(TeamPlayer)
    private readonly teamPlayerRepository: Repository<TeamPlayer>,
    private readonly teamsService: TeamsService,
    private readonly playersService: PlayersService,
  ) {}

  async create(dto: CreateTeamPlayerDto): Promise<TeamPlayerResponseDto> {
    // Tanto el jugador como el equipo deben existir previamente (si no, 404).
    const team = await this.teamsService.findOne(dto.teamId);
    const player = await this.playersService.findOne(dto.playerId);
    const playerName = `"${player.firstName} ${player.lastName}"`;

    if (!team.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo "${team.name}" está desactivado: actívalo antes de asignarle jugadores`,
      );
    }
    if (!player.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El jugador ${playerName} está desactivado: actívalo antes de asignarlo a un equipo`,
      );
    }

    // "Evitar registrar dos veces la misma asociación": el mismo jugador no puede tener con el
    // mismo equipo dos contratos que se crucen en fechas. Sí puede volver después de que el
    // anterior terminó o lo retiraron.
    const previous = await this.teamPlayerRepository.find({
      where: { team: { id: team.id }, player: { id: player.id } },
    });
    const clash = previous.find((contract) =>
      overlaps(contract, dto.startDate, dto.endDate),
    );
    if (clash) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `El jugador ${playerName} ya tiene con "${team.name}" un contrato que se cruza con esas fechas (del ${clash.startDate} al ${effectiveEndDate(clash)})`,
      );
    }

    const saved = await this.teamPlayerRepository.save(
      this.teamPlayerRepository.create({
        team: { id: team.id },
        player: { id: player.id },
        startDate: dto.startDate,
        endDate: dto.endDate,
        retiredAt: null,
      }),
    );

    return toTeamPlayerResponse(await this.findContract(saved.id));
  }

  // Jugadores de un equipo: todos sus contratos (vigentes, futuros e historial), cada uno con su
  // estado. Ordenados por apellidos del jugador y, para el mismo jugador, del más reciente al
  // más antiguo.
  async findByTeam(teamId: number): Promise<TeamPlayerResponseDto[]> {
    await this.teamsService.findOne(teamId); // 404 si el equipo no existe
    const contracts = await this.teamPlayerRepository.find({
      where: { team: { id: teamId } },
      relations: { team: true, player: true },
      order: {
        player: { lastName: 'ASC', firstName: 'ASC' },
        startDate: 'DESC',
      },
    });
    return contracts.map(toTeamPlayerResponse);
  }

  // Equipos de un jugador: su historial de traspasos, del contrato más reciente al más antiguo.
  async findByPlayer(playerId: number): Promise<TeamPlayerResponseDto[]> {
    await this.playersService.findOne(playerId); // 404 si el jugador no existe
    const contracts = await this.teamPlayerRepository.find({
      where: { player: { id: playerId } },
      relations: { team: true, player: true },
      order: { startDate: 'DESC' },
    });
    return contracts.map(toTeamPlayerResponse);
  }

  // Retirar al jugador del equipo: el contrato se cierra hoy, pero la fila se conserva como
  // historial y el jugador queda libre para otros contratos. Si el contrato era futuro, retirarlo
  // equivale a cancelarlo.
  async retire(id: number): Promise<TeamPlayerResponseDto> {
    const contract = await this.findContract(id);
    const playerName = `"${contract.player.firstName} ${contract.player.lastName}"`;

    const status = contractStatus(contract);
    if (status === ContractStatus.RETIRADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El jugador ${playerName} ya fue retirado de "${contract.team.name}" el ${contract.retiredAt}`,
      );
    }
    if (status === ContractStatus.FINALIZADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El contrato de ${playerName} con "${contract.team.name}" ya terminó el ${contract.endDate}`,
      );
    }

    contract.retiredAt = today();
    await this.teamPlayerRepository.save(contract);
    return toTeamPlayerResponse(contract);
  }

  // ---------------------------------------------------------------------------------------------

  private async findContract(id: number): Promise<TeamPlayer> {
    const contract = await this.teamPlayerRepository.findOne({
      where: { id },
      relations: { team: true, player: true },
    });
    if (!contract) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe el contrato con id ${id}`,
      );
    }
    return contract;
  }
}
