import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { MatchResponseDto } from '../matches/dto/match-response.dto';
import { MatchStatus } from '../matches/entities/match-status.enum';
import { matchLabel } from '../matches/match-label';
import { MatchesService } from '../matches/matches.service';
import { PlayersService } from '../players/players.service';
import { TeamPlayersService } from '../team-players/team-players.service';
import { CreateScoreDto } from './dto/create-score.dto';
import { DEFAULT_SCORE_POINTS, ScoreFieldsDto } from './dto/score-fields.dto';
import { ScoreResponseDto } from './dto/score-response.dto';
import { UpdateScoreDto } from './dto/update-score.dto';
import { Score } from './entities/score.entity';
import { ScoreTotalsService } from './score-totals.service';
import { toScoreResponse } from './scores.mapper';

// HU-GC-07 · Anotaciones de un partido.
@Injectable()
export class ScoresService {
  // Los services de partidos, jugadores y contratos llegan porque ScoresModule importa sus módulos:
  // con ellos se valida el partido, el jugador y su contrato, con los mensajes de sus HU.
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
    private readonly matchesService: MatchesService,
    private readonly playersService: PlayersService,
    private readonly teamPlayersService: TeamPlayersService,
    private readonly scoreTotals: ScoreTotalsService,
  ) {}

  async create(dto: CreateScoreDto): Promise<ScoreResponseDto> {
    const match = await this.matchesService.findOne(dto.matchId);
    await this.validate(dto, match);

    const saved = await this.scoreRepository.save(
      this.scoreRepository.create({
        match: { id: match.id },
        team: { id: dto.teamId },
        player: { id: dto.playerId },
        minute: dto.minute,
        points: dto.points ?? DEFAULT_SCORE_POINTS,
      }),
    );
    return this.findOne(saved.id);
  }

  // Anotaciones de un partido, en el orden en que pasaron.
  async findByMatch(matchId: number): Promise<ScoreResponseDto[]> {
    await this.matchesService.findOne(matchId); // 404 si el partido no existe
    const scores = await this.scoreRepository.find({
      where: { match: { id: matchId } },
      relations: { match: true, team: true, player: true },
      order: { minute: 'ASC', id: 'ASC' },
    });
    return scores.map(toScoreResponse);
  }

  async findOne(id: number): Promise<ScoreResponseDto> {
    return toScoreResponse(await this.findScore(id));
  }

  // El partido no cambia; lo demás, con las mismas reglas que al crear.
  async update(id: number, dto: UpdateScoreDto): Promise<ScoreResponseDto> {
    const score = await this.findScore(id);
    const match = await this.matchesService.findOne(score.match.id);
    await this.validate(dto, match, id);

    await this.scoreRepository.update(id, {
      team: { id: dto.teamId },
      player: { id: dto.playerId },
      minute: dto.minute,
      points: dto.points ?? DEFAULT_SCORE_POINTS,
    });
    return this.findOne(id);
  }

  // Solo se borra la anotación: el jugador y el partido quedan como estaban.
  async remove(id: number): Promise<void> {
    await this.findScore(id);
    await this.scoreRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  // Las reglas de crear y editar. excludeId es la anotación que se está editando.
  private async validate(
    dto: ScoreFieldsDto,
    match: MatchResponseDto,
    excludeId?: number,
  ): Promise<void> {
    if (match.status === MatchStatus.PROGRAMADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} todavía no ha empezado: las anotaciones se registran desde que está en juego`,
      );
    }
    if (match.status === MatchStatus.CANCELADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} está cancelado: no se le registran anotaciones`,
      );
    }

    const team = [match.homeTeam, match.awayTeam].find(
      (side) => side.id === dto.teamId,
    );
    if (!team) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo con id ${dto.teamId} no juega el partido ${matchLabel(match)}: la anotación debe ser del local o del visitante`,
      );
    }

    // El jugador debe pertenecer al equipo el día del partido (aunque hoy ya no esté en él).
    const player = await this.playersService.findOne(dto.playerId); // 404 si no existe
    const day = match.scheduledAt.slice(0, 10);
    if (
      !(await this.teamPlayersService.hadContractOn(team.id, player.id, day))
    ) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El jugador "${player.firstName} ${player.lastName}" no tenía contrato con "${team.name}" el ${day}, día del partido`,
      );
    }

    // Con el resultado oficial ya registrado, las anotaciones de un equipo no pueden pasarlo.
    if (match.result) {
      const official =
        team.id === match.homeTeam.id
          ? match.result.homeScore
          : match.result.awayScore;
      const total =
        (await this.scoreTotals.totalForTeam(match.id, team.id, excludeId)) +
        (dto.points ?? DEFAULT_SCORE_POINTS);
      if (total > official) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `Con esta anotación, las de "${team.name}" sumarían ${total} y su marcador oficial es ${official}: corrige primero el resultado`,
        );
      }
    }
  }

  private async findScore(id: number): Promise<Score> {
    const score = await this.scoreRepository.findOne({
      where: { id },
      relations: { match: true, team: true, player: true },
    });
    if (!score) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe la anotación con id ${id}`,
      );
    }
    return score;
  }
}
