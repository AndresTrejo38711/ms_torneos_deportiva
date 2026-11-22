import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { BetSettlementService } from '../bets/bet-settlement.service';
import { BetUsageService } from '../bets/bet-usage.service';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { FanTeamUsageService } from '../fan-teams/fan-team-usage.service';
import { nowLocalDateTime } from '../common/persistence/local-date-time.transformer';
import { GroupsService } from '../groups/groups.service';
import {
  matchCreatedEmails,
  voidedEmails,
} from '../notifications/match-emails';
import { NotificationClient } from '../notifications/notification.client';
import { voidedTicketEmails } from '../notifications/ticket-emails';
import { PhaseResponseDto } from '../phases/dto/phase-response.dto';
import { PhaseType } from '../phases/entities/phase-type.enum';
import { isGroupPhase } from '../phases/phase-kind';
import { PhasesService } from '../phases/phases.service';
import { TeamResponseDto } from '../teams/dto/team-response.dto';
import { TeamsService } from '../teams/teams.service';
import { TournamentTeamsService } from '../tournament-teams/tournament-teams.service';
import { TournamentVenuesService } from '../tournament-venues/tournament-venues.service';
import { TournamentResponseDto } from '../tournaments/dto/tournament-response.dto';
import { TournamentsService } from '../tournaments/tournaments.service';
import { ScoreTotalsService } from '../scores/score-totals.service';
import { TicketUsageService } from '../tickets/ticket-usage.service';
import { VenuesService } from '../venues/venues.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchFieldsDto } from './dto/match-fields.dto';
import { MatchGroupDto, MatchResponseDto } from './dto/match-response.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MATCH_STATUS_LABEL, MatchStatus } from './entities/match-status.enum';
import { Match } from './entities/match.entity';
import { matchLabel } from './match-label';
import { toMatchResponse } from './matches.mapper';

// HU-GC-06 · Gestionar partidos.
@Injectable()
export class MatchesService {
  // Los services de fases, torneos, grupos, equipos e inscripciones llegan porque MatchesModule
  // importa sus módulos: con ellos se valida todo lo que el partido necesita, con los mismos
  // mensajes de sus HU. ScoreTotalsService da lo que suman las anotaciones (HU-GC-07), y los de
  // apuestas y notificaciones (HU-GC-11) llegan de módulos que no dependen de nadie. Los de escenarios
  // (Anexo 4) validan el escenario del partido, TicketUsageService (que tampoco depende de nadie)
  // dice qué boletos tiene (HU-GE-04) y FanTeamUsageService, quién sigue a sus equipos (HU-GE-05).
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly phasesService: PhasesService,
    private readonly tournamentsService: TournamentsService,
    private readonly groupsService: GroupsService,
    private readonly teamsService: TeamsService,
    private readonly tournamentTeamsService: TournamentTeamsService,
    private readonly scoreTotals: ScoreTotalsService,
    private readonly betUsage: BetUsageService,
    private readonly betSettlement: BetSettlementService,
    private readonly notifications: NotificationClient,
    private readonly venuesService: VenuesService,
    private readonly tournamentVenuesService: TournamentVenuesService,
    private readonly ticketUsage: TicketUsageService,
    private readonly fanTeamUsage: FanTeamUsageService,
  ) {}

  // El partido nuevo queda PROGRAMADO. Se avisa a quienes apostaron o compraron boletos en partidos
  // anteriores de esos equipos (HU-GC-06, criterio 13) y a quienes los siguen (HU-GE-05).
  async create(dto: CreateMatchDto): Promise<MatchResponseDto> {
    const phase = await this.phasesService.findOne(dto.phaseId);
    const tournament = await this.tournamentsService.findOne(
      phase.tournament.id,
    );
    if (!tournament.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo "${tournament.name}" está desactivado: actívalo antes de programarle partidos`,
      );
    }
    await this.validate(dto, phase, tournament);

    // Para guardar las relaciones basta con los ids.
    const saved = await this.matchRepository.save(
      this.matchRepository.create({
        phase: { id: phase.id },
        homeTeam: { id: dto.homeTeamId },
        awayTeam: { id: dto.awayTeamId },
        scheduledAt: dto.scheduledAt,
        round: dto.round ?? null,
        bracketPosition: dto.bracketPosition ?? null,
        venue: dto.venueId ? { id: dto.venueId } : null,
      }),
    );

    const response = await this.findOne(saved.id);
    const teamIds = [dto.homeTeamId, dto.awayTeamId];
    // A quienes apostaron o compraron boletos en partidos anteriores de estos equipos (criterio 13) y
    // a quienes los siguen (HU-GE-05, decisión del Anexo 4).
    const participants = [
      ...new Set([
        ...(await this.betUsage.fanEmailsForTeams(teamIds, saved.id)),
        ...(await this.ticketUsage.fanEmailsForTeams(teamIds, saved.id)),
      ]),
    ];
    const followers = await this.fanTeamUsage.followersOf(teamIds);
    this.notifications.deliver(
      matchCreatedEmails(response, participants, followers),
      'partido nuevo',
    );
    return response;
  }

  // Todos los partidos, de todos los torneos, por fecha (la lista general de Partidos).
  async findAll(): Promise<MatchResponseDto[]> {
    const matches = await this.orderedByDate(this.summaryQuery()).getMany();
    return this.toResponses(matches);
  }

  // Partidos de una fase, por fecha.
  async findByPhase(phaseId: number): Promise<MatchResponseDto[]> {
    await this.phasesService.findOne(phaseId); // 404 si la fase no existe
    const matches = await this.orderedByDate(
      this.summaryQuery().where('phase.id = :phaseId', { phaseId }),
    ).getMany();
    return this.toResponses(matches);
  }

  // Todos los partidos de un torneo, de todas sus fases, por fecha.
  async findByTournament(tournamentId: number): Promise<MatchResponseDto[]> {
    await this.tournamentsService.findOne(tournamentId); // 404 si el torneo no existe
    const matches = await this.orderedByDate(
      this.summaryQuery().where('tournament.id = :tournamentId', {
        tournamentId,
      }),
    ).getMany();
    return this.toResponses(matches);
  }

  async findOne(id: number): Promise<MatchResponseDto> {
    const [response] = await this.toResponses([await this.findMatch(id)]);
    return response;
  }

  // HU-GC-11: los que reciben apuestas: programados, con las apuestas abiertas y sin haber llegado su
  // hora. Por fecha.
  async findOpenForBetting(): Promise<MatchResponseDto[]> {
    const matches = await this.orderedByDate(
      this.summaryQuery()
        .where('game.status = :status', { status: MatchStatus.PROGRAMADO })
        .andWhere('game.bettingOpen = :open', { open: true }),
    ).getMany();
    const now = nowLocalDateTime();
    return this.toResponses(matches.filter((match) => match.scheduledAt > now));
  }

  // HU-GE-04: los que venden boletos: programados, con la venta abierta y sin haber llegado su hora.
  // Por fecha.
  async findOpenForTicketSales(): Promise<MatchResponseDto[]> {
    const matches = await this.orderedByDate(
      this.summaryQuery()
        .where('game.status = :status', { status: MatchStatus.PROGRAMADO })
        .andWhere('game.ticketSalesOpen = :open', { open: true }),
    ).getMany();
    const now = nowLocalDateTime();
    return this.toResponses(matches.filter((match) => match.scheduledAt > now));
  }

  // Solo mientras esté PROGRAMADO. La fase no cambia.
  async update(id: number, dto: UpdateMatchDto): Promise<MatchResponseDto> {
    const match = await this.findMatch(id);
    if (match.status !== MatchStatus.PROGRAMADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} está ${MATCH_STATUS_LABEL[match.status]}: solo se puede editar mientras está programado`,
      );
    }
    const phase = await this.phasesService.findOne(match.phase.id);
    const tournament = await this.tournamentsService.findOne(
      phase.tournament.id,
    );
    await this.validate(dto, phase, tournament, id, match.venue?.id ?? null);

    // Las apuestas y los boletos (HU-GC-11 y HU-GE-04) se hicieron para estos equipos: la fecha sí
    // puede cambiar.
    const teamsChanged =
      dto.homeTeamId !== match.homeTeam.id ||
      dto.awayTeamId !== match.awayTeam.id;
    if (teamsChanged) {
      const bets = await this.betUsage.countForMatch(id);
      if (bets > 0) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `El partido ${matchLabel(match)} ya tiene apuestas (${bets}): sus equipos no se pueden cambiar`,
        );
      }
      const tickets = await this.ticketUsage.countForMatch(id);
      if (tickets > 0) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `El partido ${matchLabel(match)} ya tiene boletos vendidos (${tickets}): sus equipos no se pueden cambiar`,
        );
      }
    }

    // HU-GE-04: los precios de la venta son de las localidades de su escenario.
    const venueChanged = (dto.venueId ?? null) !== (match.venue?.id ?? null);
    if (venueChanged && (await this.ticketUsage.hasPrices(id))) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} tiene la venta de entradas configurada en "${match.venue?.name}": quita sus precios antes de cambiar el escenario`,
      );
    }

    await this.matchRepository.update(id, {
      homeTeam: { id: dto.homeTeamId },
      awayTeam: { id: dto.awayTeamId },
      scheduledAt: dto.scheduledAt,
      round: dto.round ?? null,
      bracketPosition: dto.bracketPosition ?? null,
      venue: dto.venueId ? { id: dto.venueId } : null,
    });

    return this.findOne(id);
  }

  // PROGRAMADO → EN_JUEGO.
  async start(id: number): Promise<MatchResponseDto> {
    const match = await this.findMatch(id);
    if (match.status !== MatchStatus.PROGRAMADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Solo se puede iniciar un partido programado: ${matchLabel(match)} está ${MATCH_STATUS_LABEL[match.status]}`,
      );
    }
    await this.matchRepository.update(id, { status: MatchStatus.EN_JUEGO });
    return this.findOne(id);
  }

  // PROGRAMADO o EN_JUEGO → CANCELADO. Sus apuestas pendientes y sus boletos quedan anulados (se
  // devuelve lo apostado y lo pagado) en la misma transacción, y se avisa a cada aficionado (HU-GC-11
  // y HU-GE-04).
  async cancel(id: number): Promise<MatchResponseDto> {
    const match = await this.findMatch(id);
    if (
      match.status !== MatchStatus.PROGRAMADO &&
      match.status !== MatchStatus.EN_JUEGO
    ) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} ya está ${MATCH_STATUS_LABEL[match.status]}: no se puede cancelar`,
      );
    }
    const { voided, voidedTickets } =
      await this.matchRepository.manager.transaction(async (manager) => {
        await manager.update(Match, id, { status: MatchStatus.CANCELADO });
        return {
          voided: await this.betSettlement.voidAll(id, manager),
          voidedTickets: await this.ticketUsage.voidAll(id, manager),
        };
      });
    const response = await this.findOne(id);
    this.notifications.deliver(
      voidedEmails(response, voided),
      'apuestas anuladas',
    );
    this.notifications.deliver(
      voidedTicketEmails(response, voidedTickets),
      'boletos anulados',
    );
    return response;
  }

  // Solo un partido programado o cancelado. Uno en juego se cancela primero, y uno finalizado se
  // queda: es historial del torneo. Uno cancelado que alcanzó a jugarse puede tener anotaciones
  // (HU-GC-07): se eliminan primero. Uno con apuestas (HU-GC-11) o boletos (HU-GE-04) se queda: son
  // historial. Los precios de su venta se van con él.
  async remove(id: number): Promise<void> {
    const match = await this.findMatch(id);
    if (match.status === MatchStatus.EN_JUEGO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} está en juego: cancélalo antes de eliminarlo`,
      );
    }
    if (match.status === MatchStatus.FINALIZADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} ya finalizó: los partidos finalizados no se eliminan, son parte del historial del torneo`,
      );
    }
    const scores = await this.scoreTotals.countInMatch(id);
    if (scores > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar el partido ${matchLabel(match)} porque tiene anotaciones (${scores}). Elimínalas primero`,
      );
    }
    const bets = await this.betUsage.countForMatch(id);
    if (bets > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar el partido ${matchLabel(match)} porque tiene apuestas (${bets}): son historial de los aficionados`,
      );
    }
    const tickets = await this.ticketUsage.countForMatch(id);
    if (tickets > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar el partido ${matchLabel(match)} porque tiene boletos (${tickets}): son historial de los aficionados`,
      );
    }
    await this.matchRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  // Las reglas de crear y editar. excludeId es el partido que se está editando (no choca consigo) y
  // currentVenueId, el escenario que ya tenía.
  private async validate(
    dto: MatchFieldsDto,
    phase: PhaseResponseDto,
    tournament: TournamentResponseDto,
    excludeId?: number,
    currentVenueId: number | null = null,
  ): Promise<void> {
    if (dto.homeTeamId === dto.awayTeamId) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'Un equipo no puede jugar contra sí mismo: el local y el visitante deben ser distintos',
      );
    }
    const home = await this.ensureTeamCanPlay(dto.homeTeamId, tournament);
    const away = await this.ensureTeamCanPlay(dto.awayTeamId, tournament);

    const day = dto.scheduledAt.slice(0, 10);
    if (day < tournament.startDate || day > tournament.endDate) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La fecha del partido debe estar dentro del torneo "${tournament.name}", del ${tournament.startDate} al ${tournament.endDate}`,
      );
    }

    if (phase.type === PhaseType.GRUPOS) {
      await this.validateGroupMatch(dto, phase, home, away);
    } else {
      await this.validateFinalMatch(dto, phase, home, away, excludeId);
    }

    await this.validateVenue(dto, tournament, excludeId, currentVenueId);
  }

  // HU-GC-06 (criterio 11) y HU-GE-02. El escenario es opcional. Si viene, debe ser uno de los
  // escenarios del torneo y estar disponible (eso solo se revisa si cambia: un partido conserva el que
  // ya tenía aunque luego lo desactiven), y no puede tener otro partido a la misma hora. Los
  // cancelados no cuentan.
  private async validateVenue(
    dto: MatchFieldsDto,
    tournament: TournamentResponseDto,
    excludeId: number | undefined,
    currentVenueId: number | null,
  ): Promise<void> {
    const venueId = dto.venueId ?? null;
    if (venueId === null) {
      return;
    }
    const venue = await this.venuesService.findOne(venueId); // 404 si no existe

    if (venueId !== currentVenueId) {
      const assigned = await this.tournamentVenuesService.isAssigned(
        tournament.id,
        venueId,
      );
      if (!assigned) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `El escenario "${venue.name}" no está asignado a "${tournament.name}": asígnalo al torneo primero`,
        );
      }
      if (!venue.available) {
        const reason =
          venue.active && venue.parent
            ? `El escenario "${venue.name}" está dentro de "${venue.parent.name}", que está desactivado`
            : `El escenario "${venue.name}" está desactivado`;
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `${reason}: no se le pueden programar partidos`,
        );
      }
    }

    const clash = await this.matchRepository.findOne({
      where: {
        venue: { id: venueId },
        scheduledAt: dto.scheduledAt,
        status: Not(MatchStatus.CANCELADO),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      relations: { homeTeam: true, awayTeam: true },
    });
    if (clash) {
      const [day, time] = dto.scheduledAt.split('T');
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `El escenario "${venue.name}" ya tiene el partido ${matchLabel(clash)} el ${day} a las ${time}`,
      );
    }
  }

  // "Habilitado para participar": registrado (si no, 404), activo e inscrito en el torneo.
  private async ensureTeamCanPlay(
    teamId: number,
    tournament: TournamentResponseDto,
  ): Promise<TeamResponseDto> {
    const team = await this.teamsService.findOne(teamId);
    if (!team.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo "${team.name}" está desactivado: no puede jugar partidos`,
      );
    }
    if (
      !(await this.tournamentTeamsService.isEnrolled(tournament.id, team.id))
    ) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo "${team.name}" no está inscrito en "${tournament.name}": inscríbelo primero`,
      );
    }
    return team;
  }

  // Fase de grupos: los dos equipos deben estar en el mismo grupo de la fase. Sin posición en la
  // llave; la jornada es opcional.
  private async validateGroupMatch(
    dto: MatchFieldsDto,
    phase: PhaseResponseDto,
    home: TeamResponseDto,
    away: TeamResponseDto,
  ): Promise<void> {
    if (dto.bracketPosition !== undefined && dto.bracketPosition !== null) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La posición en la llave solo se usa en las fases finales',
      );
    }

    const groups = await this.groupsService.findByPhase(phase.id);
    const groupOf = (team: TeamResponseDto) => {
      const group = groups.find((g) => g.teams.some((t) => t.id === team.id));
      if (!group) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `El equipo "${team.name}" no está en ningún grupo de "${phase.name}": asígnalo a un grupo primero`,
        );
      }
      return group;
    };
    const homeGroup = groupOf(home);
    const awayGroup = groupOf(away);
    if (homeGroup.id !== awayGroup.id) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${home.name}" (${homeGroup.name}) y "${away.name}" (${awayGroup.name}) están en grupos distintos: en "${phase.name}" solo se enfrentan equipos del mismo grupo`,
      );
    }
  }

  // Fase final: posición en la llave obligatoria y libre, de 1 a la mitad de los equipos, y cada
  // equipo juega una sola vez en la fase. Sin jornada.
  private async validateFinalMatch(
    dto: MatchFieldsDto,
    phase: PhaseResponseDto,
    home: TeamResponseDto,
    away: TeamResponseDto,
    excludeId?: number,
  ): Promise<void> {
    if (dto.round !== undefined && dto.round !== null) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La jornada solo se usa en las fases de grupos',
      );
    }
    const position = dto.bracketPosition;
    if (position === undefined || position === null) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La posición en la llave es obligatoria en una fase final como "${phase.name}"`,
      );
    }
    const slots = Number(phase.teamsCount) / 2;
    if (position > slots) {
      const range = slots === 1 ? 'solo puede ser 1' : `va de 1 a ${slots}`;
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${phase.name}" es de ${phase.teamsCount} equipos: la posición en la llave ${range}`,
      );
    }

    const others = (
      await this.matchRepository.find({
        where: { phase: { id: phase.id } },
        relations: { homeTeam: true, awayTeam: true },
      })
    ).filter((match) => match.id !== excludeId);

    const sameSlot = others.find((match) => match.bracketPosition === position);
    if (sameSlot) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `La posición ${position} de la llave de "${phase.name}" ya la tiene el partido ${matchLabel(sameSlot)}`,
      );
    }
    for (const team of [home, away]) {
      const taken = others.find(
        (match) =>
          match.homeTeam.id === team.id || match.awayTeam.id === team.id,
      );
      if (taken) {
        throw new ApplicationException(
          ErrorCase.ALREADY_EXISTS,
          `"${team.name}" ya tiene partido en "${phase.name}" (${matchLabel(taken)}): en una fase final cada equipo juega una sola vez`,
        );
      }
    }
  }

  // Le pone a cada partido de fase de grupos el grupo de sus equipos, y a todos lo que suman sus
  // anotaciones (el marcador en vivo).
  private async toResponses(matches: Match[]): Promise<MatchResponseDto[]> {
    const groupPhaseIds = new Set(
      matches
        .filter((match) => isGroupPhase(match.phase))
        .map((match) => match.phase.id),
    );
    const groupOf = new Map<string, MatchGroupDto>();
    for (const phaseId of groupPhaseIds) {
      for (const group of await this.groupsService.findByPhase(phaseId)) {
        for (const team of group.teams) {
          groupOf.set(`${phaseId}:${team.id}`, {
            id: group.id,
            name: group.name,
          });
        }
      }
    }
    const totals = await this.scoreTotals.totalsByMatch(
      matches.map((match) => match.id),
    );
    return matches.map((match) => {
      const byTeam = totals.get(match.id);
      return toMatchResponse(
        match,
        groupOf.get(`${match.phase.id}:${match.homeTeam.id}`) ?? null,
        {
          home: byTeam?.get(match.homeTeam.id) ?? 0,
          away: byTeam?.get(match.awayTeam.id) ?? 0,
        },
      );
    });
  }

  private async findMatch(id: number): Promise<Match> {
    const match = await this.summaryQuery()
      .where('game.id = :id', { id })
      .getOne();
    if (!match) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe el partido con id ${id}`,
      );
    }
    return match;
  }

  // Lo que necesita la respuesta: la fase con su torneo, los dos equipos y el escenario (con el que
  // lo contiene, para su ubicación). El alias es "game" porque MATCH es palabra de MySQL.
  private summaryQuery() {
    return this.matchRepository
      .createQueryBuilder('game')
      .innerJoinAndSelect('game.phase', 'phase')
      .innerJoinAndSelect('phase.tournament', 'tournament')
      .innerJoinAndSelect('game.homeTeam', 'homeTeam')
      .innerJoinAndSelect('game.awayTeam', 'awayTeam')
      .leftJoinAndSelect('game.venue', 'venue')
      .leftJoinAndSelect('venue.parent', 'venueParent');
  }

  private orderedByDate(query: ReturnType<MatchesService['summaryQuery']>) {
    return query
      .orderBy('game.scheduledAt', 'ASC')
      .addOrderBy('game.bracketPosition', 'ASC')
      .addOrderBy('game.id', 'ASC');
  }
}
