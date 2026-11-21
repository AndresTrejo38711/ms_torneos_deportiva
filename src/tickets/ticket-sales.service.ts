import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { MatchResponseDto } from '../matches/dto/match-response.dto';
import {
  MATCH_STATUS_LABEL,
  MatchStatus,
} from '../matches/entities/match-status.enum';
import { Match } from '../matches/entities/match.entity';
import { matchLabel } from '../matches/match-label';
import { MatchesService } from '../matches/matches.service';
import { VenueResponseDto } from '../venues/dto/venue-response.dto';
import { VenuesService } from '../venues/venues.service';
import { MatchTicketingDto } from './dto/match-ticketing.dto';
import {
  MatchTicketingResponseDto,
  TicketingLocalityDto,
  TicketSaleMatchDto,
} from './dto/ticket-response.dto';
import { TicketPrice } from './entities/ticket-price.entity';
import { saleClosedReason } from './ticket-rules';
import { TicketUsageService } from './ticket-usage.service';

// HU-GE-04 · La venta de entradas de cada partido: el administrador fija el precio de cada localidad
// del escenario y la abre o la cierra; el aficionado consulta los partidos que venden boletos. La
// compra está en TicketsService (S de SOLID).
@Injectable()
export class TicketSalesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(TicketPrice)
    private readonly priceRepository: Repository<TicketPrice>,
    private readonly matchesService: MatchesService,
    private readonly venuesService: VenuesService,
    private readonly ticketUsage: TicketUsageService,
  ) {}

  // Reemplaza los precios del partido y abre o cierra la venta. Solo con el partido programado y con
  // escenario (criterio 3); cada localidad debe ser del escenario del partido (criterio 11) y estar
  // activa. Una localidad con boletos vendidos no se quita de la venta.
  async configure(
    matchId: number,
    dto: MatchTicketingDto,
  ): Promise<MatchTicketingResponseDto> {
    const match = await this.matchesService.findOne(matchId);
    if (match.status !== MatchStatus.PROGRAMADO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} está ${MATCH_STATUS_LABEL[match.status]}: la venta de entradas solo se configura mientras está programado`,
      );
    }
    if (!match.venue) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${matchLabel(match)} no tiene escenario: asígnale uno antes de vender entradas`,
      );
    }
    const venue = await this.venuesService.findOne(match.venue.id);

    const chosen = new Set<number>();
    for (const item of dto.prices) {
      if (chosen.has(item.localityId)) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `La localidad con id ${item.localityId} aparece dos veces en la lista de precios`,
        );
      }
      chosen.add(item.localityId);
      const locality = venue.localities.find(
        (candidate) => candidate.id === item.localityId,
      );
      if (!locality) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `La localidad con id ${item.localityId} no es de "${venue.name}", el escenario del partido: solo se venden sus localidades`,
        );
      }
      if (!locality.active) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `La localidad "${locality.name}" está desactivada: actívala antes de venderla`,
        );
      }
    }
    if (dto.open && dto.prices.length === 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'Para abrir la venta fija el precio de al menos una localidad',
      );
    }

    const current = await this.priceRepository.find({
      where: { match: { id: matchId } },
      relations: { locality: true },
    });
    const removed = current.filter((row) => !chosen.has(row.locality.id));
    if (removed.length > 0) {
      const sold = await this.ticketUsage.soldByLocality(matchId);
      const blocked = removed
        .filter((row) => (sold.get(row.locality.id) ?? 0) > 0)
        .map((row) => `"${row.locality.name}"`);
      if (blocked.length > 0) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `${blocked.join(', ')} ya ${blocked.length === 1 ? 'tiene' : 'tienen'} boletos vendidos en el partido ${matchLabel(match)}: no se puede quitar de la venta`,
        );
      }
    }

    // Los precios y la apertura quedan juntos o no queda ninguno.
    await this.priceRepository.manager.transaction(async (manager) => {
      const prices = manager.getRepository(TicketPrice);
      if (removed.length > 0) {
        await prices.delete({ id: In(removed.map((row) => row.id)) });
      }
      for (const item of dto.prices) {
        const existing = current.find(
          (row) => row.locality.id === item.localityId,
        );
        if (existing) {
          await prices.update(existing.id, { price: item.price });
        } else {
          await prices.save(
            prices.create({
              match: { id: matchId },
              locality: { id: item.localityId },
              price: item.price,
            }),
          );
        }
      }
      await manager.update(Match, matchId, { ticketSalesOpen: dto.open });
    });

    return this.findOne(matchId);
  }

  // La venta de un partido: todas las localidades de su escenario, con su precio (o null si no se
  // venden), lo vendido y lo disponible.
  async findOne(matchId: number): Promise<MatchTicketingResponseDto> {
    const match = await this.matchesService.findOne(matchId); // 404 si no existe
    const open = await this.isOpen(matchId);
    const localities = await this.localitiesOf(match);
    return {
      matchId,
      open,
      onSale: saleClosedReason(match, open) === null,
      venue: match.venue,
      localities,
    };
  }

  // Para el aficionado (criterios 5 y 7): los partidos que hoy venden boletos, cada uno con las
  // localidades que vende (las agotadas con available 0), por fecha.
  async availableMatches(): Promise<TicketSaleMatchDto[]> {
    const matches = await this.matchesService.findOpenForTicketSales();
    const result: TicketSaleMatchDto[] = [];
    for (const match of matches) {
      const localities = (await this.localitiesOf(match))
        .filter((locality) => locality.active && locality.price !== null)
        .map(({ id, name, price, capacity, available }) => ({
          id,
          name,
          price: price as number,
          capacity,
          available,
        }));
      if (localities.length > 0) {
        result.push({ match, localities });
      }
    }
    return result;
  }

  // Lo usa la compra: si el partido vende boletos hoy (si no, el motivo).
  async ensureOnSale(match: MatchResponseDto): Promise<void> {
    const reason = saleClosedReason(match, await this.isOpen(match.id));
    if (reason) {
      throw new ApplicationException(ErrorCase.INVALID_OPERATION, reason);
    }
  }

  // Lo usa la compra: el precio de la localidad en el partido, o null si no se vende ahí.
  priceOf(matchId: number, localityId: number): Promise<TicketPrice | null> {
    return this.priceRepository.findOneBy({
      match: { id: matchId },
      locality: { id: localityId },
    });
  }

  // ---------------------------------------------------------------------------------------------

  private async isOpen(matchId: number): Promise<boolean> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      select: { id: true, ticketSalesOpen: true },
    });
    return match?.ticketSalesOpen ?? false;
  }

  private async localitiesOf(
    match: MatchResponseDto,
  ): Promise<TicketingLocalityDto[]> {
    if (!match.venue) {
      return [];
    }
    const venue: VenueResponseDto = await this.venuesService.findOne(
      match.venue.id,
    );
    const prices = new Map(
      (
        await this.priceRepository.find({
          where: { match: { id: match.id } },
          relations: { locality: true },
        })
      ).map((row) => [row.locality.id, row.price]),
    );
    const sold = await this.ticketUsage.soldByLocality(match.id);
    return venue.localities.map((locality) => {
      const taken = sold.get(locality.id) ?? 0;
      return {
        id: locality.id,
        name: locality.name,
        capacity: locality.capacity,
        active: locality.active,
        price: prices.get(locality.id) ?? null,
        sold: taken,
        available: Math.max(0, locality.capacity - taken),
      };
    });
  }
}
