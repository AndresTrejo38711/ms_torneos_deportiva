import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Not, Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { toLocalTimestamp } from '../common/persistence/local-date-time.transformer';
import { MatchResponseDto } from '../matches/dto/match-response.dto';
import {
  MATCH_STATUS_LABEL,
  MatchStatus,
} from '../matches/entities/match-status.enum';
import { Match } from '../matches/entities/match.entity';
import { matchLabel } from '../matches/match-label';
import { MatchesService } from '../matches/matches.service';
import { PlayerSummaryDto } from '../players/dto/player-response.dto';
import { PlayersService } from '../players/players.service';
import { TeamPlayersService } from '../team-players/team-players.service';
import {
  DEFAULT_HISTORY_PAGE,
  PositionHistoryQueryDto,
} from './dto/position-history-query.dto';
import {
  PositionInputDto,
  RegisterPositionsDto,
} from './dto/register-positions.dto';
import { DEFAULT_BALL_NAME, StartTrackingDto } from './dto/start-tracking.dto';
import {
  PositionRecordDto,
  TrackedMatchDto,
  TrackingBoardDto,
  TrackingSportDto,
} from './dto/tracking-response.dto';
import { Ball } from './entities/ball.entity';
import { PositionRecord } from './entities/position-record.entity';
import { TrackingStatus } from './entities/tracking-status.enum';
import {
  toLastPosition,
  toPositionRecord,
  toTrackedPlayer,
  toTrackingState,
} from './tracking.mapper';

// Cuántas posiciones recientes trae la pizarra ("Últimas actualizaciones" del mockup).
const LATEST_COUNT = 10;

// Solo lo que se necesita para armar un registro de posición.
const RECORD_FIELDS = {
  id: true,
  x: true,
  y: true,
  recordedAt: true,
  match: { id: true },
  player: { id: true },
  ball: { id: true },
} as const;

// Las plantillas de los dos equipos el día del partido.
interface Rosters {
  home: PlayerSummaryDto[];
  away: PlayerSummaryDto[];
}

// HU-GC-09 · Seguimiento deportivo del partido: el estado del seguimiento, la pelota y las posiciones
// de los jugadores y de la pelota. Las posiciones llegan por REST (el script que simula el partido las
// envía); en la etapa 2 un socket avisará a las pizarras abiertas.
//
// Usa los services de partidos (el partido y su marcador), contratos (la plantilla del día) y
// jugadores (el nombre en los mensajes); ninguno de ellos depende de este. Lo que los partidos
// necesitan de aquí está en TrackingUsageService.
@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Ball)
    private readonly ballRepository: Repository<Ball>,
    @InjectRepository(PositionRecord)
    private readonly positionRepository: Repository<PositionRecord>,
    private readonly matchesService: MatchesService,
    private readonly teamPlayersService: TeamPlayersService,
    private readonly playersService: PlayersService,
  ) {}

  // Los partidos en juego y los que ya tuvieron seguimiento (para ver su recorrido): primero los que
  // están en juego, después los demás del más reciente al más viejo.
  async findMatches(): Promise<TrackedMatchDto[]> {
    const rows = await this.matchRepository.find({
      select: {
        id: true,
        trackingStatus: true,
        trackingStartedAt: true,
        trackingFinishedAt: true,
      },
      where: [
        { status: MatchStatus.EN_JUEGO },
        { trackingStatus: Not(TrackingStatus.SIN_INICIAR) },
      ],
    });
    if (rows.length === 0) {
      return [];
    }
    const stateOf = new Map(rows.map((row) => [row.id, row]));
    const matches = (await this.matchesService.findAll()).filter((match) =>
      stateOf.has(match.id),
    );
    const playing = (match: MatchResponseDto) =>
      match.status === MatchStatus.EN_JUEGO ? 0 : 1;
    return matches
      .sort(
        (a, b) =>
          playing(a) - playing(b) || b.scheduledAt.localeCompare(a.scheduledAt),
      )
      .map((match) => ({
        match,
        tracking: toTrackingState(stateOf.get(match.id)!),
      }));
  }

  // Lo que muestra la pizarra: el partido, su deporte, el estado del seguimiento, la pelota, los
  // jugadores de cada equipo con su última posición, los contadores y las últimas posiciones.
  async board(matchId: number): Promise<TrackingBoardDto> {
    const match = await this.matchesService.findOne(matchId); // 404 si no existe (criterio 1)
    const state = await this.findState(matchId);
    const rosters = await this.rostersOf(match);
    const ball = await this.ballRepository.findOne({
      where: { match: { id: matchId } },
    });
    const last = await this.lastPositions(matchId);
    const lastOfPlayer = new Map<number, PositionRecord>();
    let lastOfBall: PositionRecord | undefined;
    for (const record of last) {
      if (record.player) {
        lastOfPlayer.set(record.player.id, record);
      } else {
        lastOfBall = record;
      }
    }
    const latest = await this.positionRepository.find({
      select: RECORD_FIELDS,
      where: { match: { id: matchId } },
      relations: { match: true, player: true, ball: true },
      order: { id: 'DESC' },
      take: LATEST_COUNT,
    });

    return {
      match,
      sport: await this.sportOf(matchId),
      tracking: toTrackingState(state),
      ball: ball
        ? {
            id: ball.id,
            name: ball.name,
            lastPosition: toLastPosition(lastOfBall),
          }
        : null,
      home: {
        team: match.homeTeam,
        players: rosters.home.map((player) =>
          toTrackedPlayer(player, lastOfPlayer.get(player.id)),
        ),
      },
      away: {
        team: match.awayTeam,
        players: rosters.away.map((player) =>
          toTrackedPlayer(player, lastOfPlayer.get(player.id)),
        ),
      },
      totals: {
        records: await this.positionRepository.count({
          where: { match: { id: matchId } },
        }),
        playersTracked: lastOfPlayer.size,
      },
      latest: latest.map(toPositionRecord),
    };
  }

  // Todas las posiciones del partido, en el orden en que se registraron y por páginas (criterio 13).
  async history(
    matchId: number,
    query: PositionHistoryQueryDto,
  ): Promise<PositionRecordDto[]> {
    await this.matchesService.findOne(matchId); // 404 si el partido no existe
    const records = await this.positionRepository.find({
      select: RECORD_FIELDS,
      where: {
        match: { id: matchId },
        ...(query.afterId ? { id: MoreThan(query.afterId) } : {}),
      },
      relations: { match: true, player: true, ball: true },
      order: { id: 'ASC' },
      take: query.limit ?? DEFAULT_HISTORY_PAGE,
    });
    return records.map(toPositionRecord);
  }

  // Sin iniciar → activo (la primera vez crea la pelota del partido) o en pausa → activo. Solo con el
  // partido en juego.
  async start(
    matchId: number,
    dto: StartTrackingDto,
  ): Promise<TrackingBoardDto> {
    const match = await this.matchesService.findOne(matchId);
    const state = await this.findState(matchId);
    if (state.trackingStatus === TrackingStatus.FINALIZADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El seguimiento de ${matchLabel(match)} ya finalizó: no se vuelve a abrir (sus posiciones se conservan)`,
      );
    }
    this.ensurePlaying(match, 'iniciar su seguimiento');
    if (state.trackingStatus === TrackingStatus.ACTIVO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El seguimiento de ${matchLabel(match)} ya está activo`,
      );
    }

    await this.matchRepository.manager.transaction(async (manager) => {
      const ball = await manager.findOne(Ball, {
        where: { match: { id: matchId } },
      });
      if (!ball) {
        await manager.save(
          manager.create(Ball, {
            match: { id: matchId },
            name: dto.ballName || DEFAULT_BALL_NAME,
          }),
        );
      }
      await manager.update(Match, matchId, {
        trackingStatus: TrackingStatus.ACTIVO,
        trackingStartedAt: state.trackingStartedAt ?? new Date(),
      });
    });
    return this.board(matchId);
  }

  // Activo → en pausa: deja de recibir posiciones hasta que se reanude.
  async pause(matchId: number): Promise<TrackingBoardDto> {
    const match = await this.matchesService.findOne(matchId);
    const state = await this.findState(matchId);
    if (state.trackingStatus !== TrackingStatus.ACTIVO) {
      const reason: Record<TrackingStatus, string> = {
        [TrackingStatus.SIN_INICIAR]: 'no se ha iniciado',
        [TrackingStatus.PAUSADO]: 'ya está en pausa',
        [TrackingStatus.FINALIZADO]: 'ya finalizó',
        [TrackingStatus.ACTIVO]: '',
      };
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El seguimiento de ${matchLabel(match)} ${reason[state.trackingStatus]}: solo se pausa uno activo`,
      );
    }
    await this.matchRepository.update(matchId, {
      trackingStatus: TrackingStatus.PAUSADO,
    });
    return this.board(matchId);
  }

  // Activo o en pausa → finalizado. No se vuelve a abrir, y no borra el partido, los jugadores, la
  // pelota ni las posiciones (criterio 16).
  async finish(matchId: number): Promise<TrackingBoardDto> {
    const match = await this.matchesService.findOne(matchId);
    const state = await this.findState(matchId);
    if (state.trackingStatus === TrackingStatus.SIN_INICIAR) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El seguimiento de ${matchLabel(match)} no se ha iniciado: no hay nada que finalizar`,
      );
    }
    if (state.trackingStatus === TrackingStatus.FINALIZADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El seguimiento de ${matchLabel(match)} ya finalizó`,
      );
    }
    await this.matchRepository.update(matchId, {
      trackingStatus: TrackingStatus.FINALIZADO,
      trackingFinishedAt: new Date(),
    });
    return this.board(matchId);
  }

  // Registrar posiciones de jugadores y de la pelota (criterios 7, 8, 11 y 12). Todas o ninguna, solo
  // con el seguimiento activo. Actualizar una posición es registrar una nueva: nada se sobrescribe.
  async registerPositions(
    matchId: number,
    dto: RegisterPositionsDto,
  ): Promise<PositionRecordDto[]> {
    const match = await this.matchesService.findOne(matchId);
    const state = await this.findState(matchId);
    if (state.trackingStatus !== TrackingStatus.ACTIVO) {
      const reason: Record<TrackingStatus, string> = {
        [TrackingStatus.SIN_INICIAR]:
          'no se ha iniciado: inícialo antes de registrar posiciones',
        [TrackingStatus.PAUSADO]:
          'está en pausa: reanúdalo para registrar posiciones',
        [TrackingStatus.FINALIZADO]: 'ya finalizó: no recibe posiciones',
        [TrackingStatus.ACTIVO]: '',
      };
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El seguimiento de ${matchLabel(match)} ${reason[state.trackingStatus]}`,
      );
    }
    this.ensurePlaying(match, 'registrar posiciones');
    await this.validatePositions(match, dto.positions);

    const ball = await this.ballRepository.findOneOrFail({
      where: { match: { id: matchId } },
    });
    const now = new Date();
    const rows = dto.positions.map((position) =>
      this.positionRepository.create({
        match: { id: matchId },
        player: position.playerId ? { id: position.playerId } : null,
        ball: position.ball ? { id: ball.id } : null,
        x: position.x,
        y: position.y,
        recordedAt: now,
      }),
    );
    // Un solo INSERT con todas: quedan todas o ninguna.
    const { identifiers } = await this.positionRepository.insert(rows);
    return dto.positions.map((position, index) => ({
      id: Number(identifiers[index].id),
      matchId,
      playerId: position.playerId ?? null,
      ball: position.ball === true,
      x: position.x,
      y: position.y,
      recordedAt: toLocalTimestamp(now),
    }));
  }

  // ---------------------------------------------------------------------------------------------

  // Cada posición es de un jugador o de la pelota, ninguno se repite en la petición y cada jugador
  // está en la plantilla de uno de los dos equipos el día del partido (criterio 14).
  private async validatePositions(
    match: MatchResponseDto,
    positions: PositionInputDto[],
  ): Promise<void> {
    const players = new Set<number>();
    let balls = 0;
    positions.forEach((position, index) => {
      const hasPlayer =
        position.playerId !== undefined && position.playerId !== null;
      const isBall = position.ball === true;
      if (hasPlayer === isBall) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `La posición ${index + 1} debe ser de un jugador ("playerId") o de la pelota ("ball": true), no de los dos ni de ninguno`,
        );
      }
      if (isBall) {
        balls++;
      } else if (players.has(position.playerId!)) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `El jugador con id ${position.playerId} aparece dos veces: envía una sola posición por jugador en cada petición`,
        );
      } else {
        players.add(position.playerId!);
      }
    });
    if (balls > 1) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La pelota aparece dos veces: envía una sola posición de la pelota en cada petición',
      );
    }

    const rosters = await this.rostersOf(match);
    const playing = new Set(
      [...rosters.home, ...rosters.away].map((player) => player.id),
    );
    for (const playerId of players) {
      if (!playing.has(playerId)) {
        const player = await this.playersService.findOne(playerId); // 404 si no existe
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `El jugador "${player.firstName} ${player.lastName}" no juega el partido ${matchLabel(match)}: no tenía contrato con "${match.homeTeam.name}" ni con "${match.awayTeam.name}" el ${match.scheduledAt.slice(0, 10)}`,
        );
      }
    }
  }

  // Las posiciones solo se registran (y el seguimiento solo se inicia) con el partido en juego.
  private ensurePlaying(match: MatchResponseDto, action: string): void {
    if (match.status === MatchStatus.PROGRAMADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} todavía no ha empezado: inícialo antes de ${action}`,
      );
    }
    if (match.status !== MatchStatus.EN_JUEGO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} está ${MATCH_STATUS_LABEL[match.status]}: ya no se puede ${action}`,
      );
    }
  }

  // Los jugadores de cada equipo: los que tenían contrato el día del partido, como en las anotaciones.
  // Un jugador con contrato en los dos equipos (caso raro) sale solo en el local.
  private async rostersOf(match: MatchResponseDto): Promise<Rosters> {
    const day = match.scheduledAt.slice(0, 10);
    const home = await this.teamPlayersService.rosterOn(match.homeTeam.id, day);
    const homeIds = new Set(home.map((player) => player.id));
    const away = (
      await this.teamPlayersService.rosterOn(match.awayTeam.id, day)
    ).filter((player) => !homeIds.has(player.id));
    return { home, away };
  }

  // La última posición de cada jugador y de la pelota del partido.
  private async lastPositions(matchId: number): Promise<PositionRecord[]> {
    const rows = await this.positionRepository
      .createQueryBuilder('pos')
      .select('MAX(pos.id)', 'id')
      .where('pos.match_id = :matchId', { matchId })
      .groupBy('pos.player_id')
      .addGroupBy('pos.ball_id')
      .getRawMany<{ id: number | string }>();
    if (rows.length === 0) {
      return [];
    }
    return this.positionRepository.find({
      select: RECORD_FIELDS,
      where: { id: In(rows.map((row) => Number(row.id))) },
      relations: { match: true, player: true, ball: true },
    });
  }

  // El estado del seguimiento (columnas del partido). El partido ya se buscó, así que existe.
  private async findState(matchId: number): Promise<Match> {
    return this.matchRepository.findOneOrFail({
      select: {
        id: true,
        trackingStatus: true,
        trackingStartedAt: true,
        trackingFinishedAt: true,
      },
      where: { id: matchId },
    });
  }

  // El deporte del torneo del partido, con el nombre de su padre si es un subdeporte.
  private async sportOf(matchId: number): Promise<TrackingSportDto> {
    const row = await this.matchRepository
      .createQueryBuilder('game')
      .innerJoin('game.phase', 'phase')
      .innerJoin('phase.tournament', 'tournament')
      .innerJoin('tournament.sport', 'sport')
      .leftJoin('sport.parent', 'parent')
      .select('sport.id', 'id')
      .addSelect('sport.name', 'name')
      .addSelect('parent.name', 'parentName')
      .where('game.id = :matchId', { matchId })
      .getRawOne<{
        id: number | string;
        name: string;
        parentName: string | null;
      }>();
    return {
      id: Number(row!.id),
      name: row!.name,
      parentName: row!.parentName ?? null,
    };
  }
}
