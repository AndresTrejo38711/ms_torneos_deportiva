import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository, SelectQueryBuilder } from 'typeorm';
import { MatchStatus } from '../matches/entities/match-status.enum';
import { TicketPrice } from './entities/ticket-price.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketStatus } from './entities/ticket.enums';
import { holdSince } from './ticket-rules';

// Responde preguntas sobre los boletos sin depender de nadie: cuántos usan un partido, una localidad
// o un método de pago, cuántos se vendieron, a quién escribirle, y anula los de un partido cancelado.
//
// Como BetUsageService: lo usan los partidos, las anotaciones, las localidades y los métodos de pago,
// de los que la venta de entradas depende. Si fuera parte de TicketsService habría ciclos (S y D de
// SOLID).
@Injectable()
export class TicketUsageService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketPrice)
    private readonly priceRepository: Repository<TicketPrice>,
  ) {}

  // Boletos de un partido, de cualquier estado: son historial.
  countForMatch(matchId: number): Promise<number> {
    return this.ticketRepository.count({ where: { match: { id: matchId } } });
  }

  // Si el partido tiene la venta configurada (algún precio por localidad).
  hasPrices(matchId: number): Promise<boolean> {
    return this.priceRepository.existsBy({ match: { id: matchId } });
  }

  // Boletos de una localidad, de cualquier partido y estado.
  countForLocality(localityId: number): Promise<number> {
    return this.ticketRepository.count({
      where: { locality: { id: localityId } },
    });
  }

  // Partidos en los que la localidad tiene precio.
  countPricesForLocality(localityId: number): Promise<number> {
    return this.priceRepository.count({
      where: { locality: { id: localityId } },
    });
  }

  // Boletos pagados con un método de pago.
  countForPaymentMethod(paymentMethodId: number): Promise<number> {
    return this.ticketRepository.count({
      where: { paymentMethod: { id: paymentMethodId } },
    });
  }

  // Vendidos de cada localidad en un partido: los pagados y los pendientes que todavía apartan su
  // cupo. Con manager, dentro de la transacción de una compra.
  async soldByLocality(
    matchId: number,
    manager?: EntityManager,
  ): Promise<Map<number, number>> {
    const rows = await this.taken(this.repository(manager))
      .select('ticket.locality_id', 'localityId')
      .addSelect('COUNT(*)', 'sold')
      .andWhere('ticket.match_id = :matchId', { matchId })
      .groupBy('ticket.locality_id')
      .getRawMany<{ localityId: number; sold: string }>();
    return new Map(
      rows.map((row) => [Number(row.localityId), Number(row.sold)]),
    );
  }

  // Lo más vendido de una localidad en un partido que todavía no se jugó (programado o en juego): su
  // capacidad no puede bajar de ahí.
  async maxSoldInPendingMatches(localityId: number): Promise<number> {
    const rows = await this.taken(this.ticketRepository)
      .innerJoin('ticket.match', 'game')
      .select('COUNT(*)', 'sold')
      .andWhere('ticket.locality_id = :localityId', { localityId })
      .andWhere('game.status IN (:...statuses)', {
        statuses: [MatchStatus.PROGRAMADO, MatchStatus.EN_JUEGO],
      })
      .groupBy('ticket.match_id')
      .getRawMany<{ sold: string }>();
    return Math.max(0, ...rows.map((row) => Number(row.sold)));
  }

  // Correos de quienes tienen boletos pagados para un partido.
  async fanEmailsForMatch(matchId: number): Promise<string[]> {
    const tickets = await this.ticketRepository.find({
      where: { match: { id: matchId }, status: TicketStatus.PAGADO },
      relations: { fan: true },
    });
    return distinctEmails(tickets);
  }

  // Correos de quienes compraron boletos para partidos anteriores de estos equipos (HU-GC-06,
  // criterio 13).
  async fanEmailsForTeams(
    teamIds: number[],
    excludeMatchId: number,
  ): Promise<string[]> {
    const tickets = await this.ticketRepository
      .createQueryBuilder('ticket')
      .innerJoinAndSelect('ticket.fan', 'fan')
      .innerJoin('ticket.match', 'game')
      .where('game.id <> :excludeMatchId', { excludeMatchId })
      .andWhere('ticket.status = :paid', { paid: TicketStatus.PAGADO })
      .andWhere(
        '(game.home_team_id IN (:...teamIds) OR game.away_team_id IN (:...teamIds))',
        { teamIds },
      )
      .getMany();
    return distinctEmails(tickets);
  }

  // El partido se canceló: sus boletos pagados o pendientes quedan anulados (se devuelve lo pagado).
  // Recibe el EntityManager de la transacción del partido. Devuelve los anulados, con su aficionado y
  // su localidad, para escribirles.
  async voidAll(matchId: number, manager?: EntityManager): Promise<Ticket[]> {
    const repository = this.repository(manager);
    const open = await repository.find({
      where: {
        match: { id: matchId },
        status: In([TicketStatus.PAGADO, TicketStatus.PENDIENTE]),
      },
      relations: { fan: true, locality: true },
      order: { id: 'ASC' },
    });
    if (open.length === 0) {
      return [];
    }
    const now = new Date();
    await repository.update(
      { id: In(open.map((ticket) => ticket.id)) },
      { status: TicketStatus.ANULADO, closedAt: now },
    );
    for (const ticket of open) {
      ticket.status = TicketStatus.ANULADO;
      ticket.closedAt = now;
    }
    return open;
  }

  // ---------------------------------------------------------------------------------------------

  private repository(manager?: EntityManager): Repository<Ticket> {
    return manager?.getRepository(Ticket) ?? this.ticketRepository;
  }

  // Los boletos que ocupan cupo: pagados, o pendientes que todavía lo apartan.
  private taken(repository: Repository<Ticket>): SelectQueryBuilder<Ticket> {
    return repository
      .createQueryBuilder('ticket')
      .where(
        '(ticket.status = :paid OR (ticket.status = :pending AND ticket.created_at >= :since))',
        {
          paid: TicketStatus.PAGADO,
          pending: TicketStatus.PENDIENTE,
          since: holdSince(),
        },
      );
  }
}

function distinctEmails(tickets: Ticket[]): string[] {
  return [...new Set(tickets.map((ticket) => ticket.fan.email))];
}
