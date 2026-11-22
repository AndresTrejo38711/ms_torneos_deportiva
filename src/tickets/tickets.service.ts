import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { FanPaymentMethodsService } from '../fan-payment-methods/fan-payment-methods.service';
import { Fan } from '../fans/entities/fan.entity';
import { FansService } from '../fans/fans.service';
import {
  MATCH_STATUS_LABEL,
  MatchStatus,
} from '../matches/entities/match-status.enum';
import { matchLabel } from '../matches/match-label';
import { MatchesService } from '../matches/matches.service';
import { NotificationClient } from '../notifications/notification.client';
import {
  lateTicketsVoidedEmail,
  ticketsPurchasedEmail,
} from '../notifications/ticket-emails';
import { PaymentGateway, PaymentStart } from '../payments/payment-gateway';
import { AuthenticatedUser } from '../security/authenticated-user';
import { VenuesService } from '../venues/venues.service';
import { BuyTicketsDto } from './dto/buy-tickets.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import {
  TicketPurchaseResponseDto,
  TicketResponseDto,
} from './dto/ticket-response.dto';
import { TicketPrice } from './entities/ticket-price.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketStatus } from './entities/ticket.enums';
import {
  holdSince,
  newPaymentReference,
  newTicketCode,
  PENDING_HOLD_MINUTES,
} from './ticket-rules';
import { TicketSalesService } from './ticket-sales.service';
import { TicketUsageService } from './ticket-usage.service';
import { TICKET_RELATIONS, toTicketResponse } from './tickets.mapper';

// HU-GE-04 · Compra de boletos. El aficionado compra para un partido que vende boletos, en una
// localidad de su escenario, con uno de sus métodos de pago (sale del token: los boletos de otro
// responden 404). El cobro lo hace la pasarela de pago, sin saber cuál es (D de SOLID): la simulada
// aprueba al instante; con ePayco la compra queda pendiente hasta que se confirma el pago.
@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly matchesService: MatchesService,
    private readonly venuesService: VenuesService,
    private readonly fansService: FansService,
    private readonly fanPaymentMethodsService: FanPaymentMethodsService,
    private readonly sales: TicketSalesService,
    private readonly ticketUsage: TicketUsageService,
    private readonly gateway: PaymentGateway,
    private readonly notifications: NotificationClient,
  ) {}

  // Genera los boletos (uno por entrada, todos con la misma referencia de pago) y los cobra. Si algo
  // no se cumple, no se genera ninguno y el mensaje dice por qué (criterio 17).
  async buy(
    user: AuthenticatedUser,
    dto: BuyTicketsDto,
  ): Promise<TicketPurchaseResponseDto> {
    const fan = await this.fansService.resolve(user);
    const match = await this.matchesService.findOne(dto.matchId); // 404 si no existe
    await this.sales.ensureOnSale(match); // criterio 2

    // Solo las localidades del escenario donde se juega el partido (criterios 3, 7 y 11).
    if (!match.venue) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} no tiene escenario: no vende boletos`,
      );
    }
    const venue = await this.venuesService.findOne(match.venue.id);
    const locality = venue.localities.find(
      (candidate) => candidate.id === dto.localityId,
    );
    if (!locality) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La localidad con id ${dto.localityId} no es de "${venue.name}", donde se juega el partido ${matchLabel(match)}`,
      );
    }
    if (!locality.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La localidad "${locality.name}" está desactivada: no vende boletos`,
      );
    }
    const price = await this.sales.priceOf(match.id, locality.id);
    if (!price) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La localidad "${locality.name}" no está a la venta en el partido ${matchLabel(match)}`,
      );
    }
    const method = await this.fanPaymentMethodsService.findUsable(
      fan,
      dto.fanPaymentMethodId,
    );

    // La disponibilidad se revisa y los boletos se generan en una sola transacción, con el precio de la
    // localidad bloqueado: dos compras al mismo tiempo se ponen en fila y no pasan la capacidad
    // (criterios 4, 9 y 12).
    const reference = newPaymentReference();
    await this.ticketRepository.manager.transaction(async (manager) => {
      await manager
        .getRepository(TicketPrice)
        .createQueryBuilder('price')
        .setLock('pessimistic_write')
        .where('price.id = :id', { id: price.id })
        .getOne();
      const sold =
        (await this.ticketUsage.soldByLocality(match.id, manager)).get(
          locality.id,
        ) ?? 0;
      const left = locality.capacity - sold;
      if (left <= 0) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `"${locality.name}" está agotada para el partido ${matchLabel(match)}: no quedan boletos`,
        );
      }
      if (dto.quantity > left) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `En "${locality.name}" quedan ${left} ${left === 1 ? 'boleto' : 'boletos'} para el partido ${matchLabel(match)}: no alcanzan para ${dto.quantity}`,
        );
      }
      const tickets = manager.getRepository(Ticket);
      await tickets.save(
        Array.from({ length: dto.quantity }, () =>
          tickets.create({
            code: newTicketCode(),
            match: { id: match.id },
            locality: { id: locality.id },
            fan: { id: fan.id },
            paymentMethod: { id: method.id },
            price: price.price,
            paymentReference: reference,
          }),
        ),
      );
    });

    const total = price.price * dto.quantity;
    let outcome: PaymentStart;
    try {
      outcome = await this.gateway.start({
        reference,
        amount: total,
        description: `${dto.quantity} ${dto.quantity === 1 ? 'boleto' : 'boletos'} · ${matchLabel(match)} · ${locality.name}`,
        buyerEmail: fan.email,
        method: {
          code: method.paymentMethod.code,
          kind: method.paymentMethod.kind,
          lastFour: method.lastFour,
        },
      });
    } catch (error) {
      // Si la pasarela no pudo iniciar el cobro, los boletos no se quedan con el cupo.
      await this.reject(reference, 'No se pudo iniciar el pago');
      throw error;
    }

    if (outcome.status === 'RECHAZADO') {
      await this.reject(reference, outcome.reason);
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La pasarela de pago no aprobó el pago: ${outcome.reason}. Los boletos no quedaron comprados`,
      );
    }
    if (outcome.status === 'APROBADO') {
      await this.ticketRepository.update(
        { paymentReference: reference },
        { status: TicketStatus.PAGADO, paidAt: new Date() },
      );
    }

    // Confirmación de la compra (criterio 16): la respuesta y, si ya está pagada, un correo. Si quedó
    // pendiente, checkout trae lo que el front necesita para abrir la pasarela.
    const purchase = await this.purchaseOf(
      fan,
      reference,
      outcome.status === 'PENDIENTE' ? outcome.checkout : null,
    );
    if (purchase.status === TicketStatus.PAGADO) {
      this.notifyPaid(purchase);
    }
    return purchase;
  }

  // Confirma el pago de una compra (criterio 18) con la referencia que la pasarela le dio al
  // aficionado al pagar: se le pregunta a la pasarela cómo quedó ese pago, nunca se le cree al
  // navegador. Si la compra ya terminó (pagada, anulada, o rechazada sin un pago nuevo), se responde
  // como está: confirmar dos veces no cobra ni envía nada de nuevo.
  async confirm(
    user: AuthenticatedUser,
    reference: string,
    dto: ConfirmPaymentDto,
  ): Promise<TicketPurchaseResponseDto> {
    const fan = await this.fansService.resolve(user);
    const tickets = await this.ticketRepository.find({
      where: { paymentReference: reference, fan: { id: fan.id } },
      relations: { match: true, locality: true },
      order: { id: 'ASC' },
    });
    const [first] = tickets;
    if (!first) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No tienes una compra con la referencia ${reference}`,
      );
    }
    // Un pago rechazado se puede reintentar en la pasarela: si llega otro pago para la misma compra, se
    // consulta. Si la pasarela la rechazó al iniciarla, no hubo a dónde ir a pagar.
    const retried =
      first.status === TicketStatus.RECHAZADO &&
      first.gatewayReference !== null &&
      dto.gatewayReference !== undefined &&
      dto.gatewayReference !== first.gatewayReference;
    if (first.status !== TicketStatus.PENDIENTE && !retried) {
      return this.purchaseOf(fan, reference, null);
    }

    const gatewayReference = dto.gatewayReference ?? first.gatewayReference;
    if (!gatewayReference) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'Falta la referencia del pago (gatewayReference): la da la pasarela al terminar de pagar',
      );
    }
    const result = await this.gateway.check({
      reference,
      amount: tickets.reduce((sum, ticket) => sum + ticket.price, 0),
      gatewayReference,
    });

    if (result.status === 'APROBADO') {
      const settled = await this.settle(
        first,
        tickets.length,
        gatewayReference,
      );
      const purchase = await this.purchaseOf(fan, reference, null);
      if (settled === TicketStatus.PAGADO) {
        this.notifyPaid(purchase);
      }
      if (settled === TicketStatus.ANULADO) {
        const email = lateTicketsVoidedEmail(purchase);
        if (email) {
          this.notifications.deliver([email], 'compra anulada');
        }
      }
      return purchase;
    }
    // Rechazado: los boletos dejan de servir. Pendiente: siguen esperando (se puede volver a consultar
    // sin enviar la referencia).
    await this.ticketRepository.update(
      { paymentReference: reference, status: first.status },
      result.status === 'RECHAZADO'
        ? {
            status: TicketStatus.RECHAZADO,
            closedAt: new Date(),
            gatewayReference,
            paymentDetail: result.reason,
          }
        : {
            status: TicketStatus.PENDIENTE,
            closedAt: null,
            gatewayReference,
            paymentDetail: result.reason,
          },
    );
    return this.purchaseOf(fan, reference, null);
  }

  // Los del aficionado, del más reciente al más antiguo (criterio 13).
  async findMine(user: AuthenticatedUser): Promise<TicketResponseDto[]> {
    const fan = await this.fansService.resolve(user);
    const tickets = await this.ticketRepository.find({
      where: { fan: { id: fan.id } },
      relations: TICKET_RELATIONS,
      order: { id: 'DESC' },
    });
    return tickets.map(toTicketResponse);
  }

  async findOne(
    user: AuthenticatedUser,
    id: number,
  ): Promise<TicketResponseDto> {
    const fan = await this.fansService.resolve(user);
    const ticket = await this.ticketRepository.findOne({
      where: { id, fan: { id: fan.id } },
      relations: TICKET_RELATIONS,
    });
    if (!ticket) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No tienes un boleto con id ${id}`,
      );
    }
    return toTicketResponse(ticket);
  }

  // Para el administrador: los boletos de un partido, en el orden en que se compraron (criterio 14).
  async findByMatch(matchId: number): Promise<TicketResponseDto[]> {
    await this.matchesService.findOne(matchId); // 404 si el partido no existe
    const tickets = await this.ticketRepository.find({
      where: { match: { id: matchId } },
      relations: TICKET_RELATIONS,
      order: { id: 'ASC' },
    });
    return tickets.map(toTicketResponse);
  }

  // ---------------------------------------------------------------------------------------------

  // Deja pagada una compra que la pasarela aprobó. Si su cupo ya no estaba apartado (pasaron los 15
  // minutos de la reserva, o estaba rechazada y se pagó al reintentar), se revisa de nuevo con el
  // precio bloqueado, como al comprar: si el partido ya no está programado o la localidad se llenó,
  // la compra se anula y se devuelve lo pagado (nunca se pasa la capacidad: criterios 4 y 12).
  // Devuelve null si otra confirmación ya la cerró.
  private async settle(
    first: Ticket,
    quantity: number,
    gatewayReference: string,
  ): Promise<TicketStatus | null> {
    const { match, locality } = first;
    const price = await this.sales.priceOf(match.id, locality.id);
    return this.ticketRepository.manager.transaction(async (manager) => {
      if (price) {
        await manager
          .getRepository(TicketPrice)
          .createQueryBuilder('price')
          .setLock('pessimistic_write')
          .where('price.id = :id', { id: price.id })
          .getOne();
      }
      const tickets = manager.getRepository(Ticket);
      const current = await tickets.findOneBy({ id: first.id });
      if (!current || current.status !== first.status) {
        return null;
      }
      let voided: string | null = null;
      const held =
        current.status === TicketStatus.PENDIENTE &&
        current.createdAt >= holdSince();
      if (!held) {
        const sold =
          (await this.ticketUsage.soldByLocality(match.id, manager)).get(
            locality.id,
          ) ?? 0;
        if (match.status !== MatchStatus.PROGRAMADO) {
          voided = `Para entonces el partido ya estaba ${MATCH_STATUS_LABEL[match.status]}. Se devuelve lo pagado.`;
        } else if (sold + quantity > locality.capacity) {
          voided = `El pago llegó después de los ${PENDING_HOLD_MINUTES} minutos de la reserva y "${locality.name}" ya estaba llena. Se devuelve lo pagado.`;
        }
      }
      const now = new Date();
      await tickets.update(
        { paymentReference: first.paymentReference, status: current.status },
        voided
          ? {
              status: TicketStatus.ANULADO,
              closedAt: now,
              gatewayReference,
              paymentDetail: voided,
            }
          : {
              status: TicketStatus.PAGADO,
              paidAt: now,
              closedAt: null,
              gatewayReference,
              paymentDetail: null,
            },
      );
      return voided ? TicketStatus.ANULADO : TicketStatus.PAGADO;
    });
  }

  // Los boletos de una compra que la pasarela no aprobó dejan de apartar cupo.
  private async reject(reference: string, reason: string): Promise<void> {
    await this.ticketRepository.update(
      { paymentReference: reference },
      {
        status: TicketStatus.RECHAZADO,
        closedAt: new Date(),
        paymentDetail: reason,
      },
    );
  }

  // El correo con los códigos para entrar (criterio 16).
  private notifyPaid(purchase: TicketPurchaseResponseDto): void {
    const email = ticketsPurchasedEmail(purchase);
    if (email) {
      this.notifications.deliver([email], 'boletos comprados');
    }
  }

  private async purchaseOf(
    fan: Fan,
    reference: string,
    checkout: Record<string, unknown> | null,
  ): Promise<TicketPurchaseResponseDto> {
    const tickets = await this.ticketRepository.find({
      where: { paymentReference: reference, fan: { id: fan.id } },
      relations: TICKET_RELATIONS,
      order: { id: 'ASC' },
    });
    const responses = tickets.map(toTicketResponse);
    return {
      reference,
      status: responses[0].status,
      quantity: responses.length,
      unitPrice: responses[0].price,
      total: responses.reduce((sum, ticket) => sum + ticket.price, 0),
      gateway: this.gateway.name,
      checkout,
      detail: responses[0].paymentDetail,
      tickets: responses,
    };
  }
}
