import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { VenueResponseDto } from '../venues/dto/venue-response.dto';
import { TicketUsageService } from '../tickets/ticket-usage.service';
import { VenuesService } from '../venues/venues.service';
import { CreateLocalityDto } from './dto/create-locality.dto';
import { LocalityResponseDto } from './dto/locality-response.dto';
import { UpdateLocalityDto } from './dto/update-locality.dto';
import { Locality } from './entities/locality.entity';
import { toLocalityResponse } from './localities.mapper';

// HU-GE-03 · Gestionar localidades de un escenario.
@Injectable()
export class LocalitiesService {
  // VenuesService llega porque LocalitiesModule importa VenuesModule: con él se valida que el
  // escenario exista y se pueda usar, con los mismos mensajes de la HU-GE-01.
  constructor(
    @InjectRepository(Locality)
    private readonly localityRepository: Repository<Locality>,
    private readonly venuesService: VenuesService,
    private readonly ticketUsage: TicketUsageService,
  ) {}

  async create(dto: CreateLocalityDto): Promise<LocalityResponseDto> {
    const venue = await this.venuesService.findOne(dto.venueId);
    ensureAvailable(venue, 'agregarle localidades');
    await this.ensureNameAvailable(venue.id, venue.name, dto.name);

    // Para guardar la relación basta con el id: TypeORM llena venue_id con él.
    const saved = await this.localityRepository.save(
      this.localityRepository.create({
        venue: { id: venue.id },
        name: dto.name,
        capacity: dto.capacity,
        description: dto.description || null,
      }),
    );

    return this.findOne(saved.id);
  }

  // Localidades de un escenario, ordenadas por nombre (activas e inactivas).
  async findByVenue(venueId: number): Promise<LocalityResponseDto[]> {
    await this.venuesService.findOne(venueId); // 404 si el escenario no existe
    const localities = await this.localityRepository.find({
      where: { venue: { id: venueId } },
      relations: { venue: true },
      order: { name: 'ASC' },
    });
    return localities.map(toLocalityResponse);
  }

  async findOne(id: number): Promise<LocalityResponseDto> {
    return toLocalityResponse(await this.findLocality(id));
  }

  async update(
    id: number,
    dto: UpdateLocalityDto,
  ): Promise<LocalityResponseDto> {
    const locality = await this.findLocality(id);
    await this.ensureNameAvailable(
      locality.venue.id,
      locality.venue.name,
      dto.name,
      id,
    );

    // HU-GE-04: la capacidad no baja de lo que ya se vendió en un partido que todavía no se jugó.
    const sold = await this.ticketUsage.maxSoldInPendingMatches(id);
    if (dto.capacity < sold) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Ya se vendieron ${sold} boletos de "${locality.name}" para un partido que no se ha jugado: la capacidad no puede ser menor`,
      );
    }

    await this.localityRepository.update(id, {
      name: dto.name,
      capacity: dto.capacity,
      description: dto.description || null,
    });

    return this.findOne(id);
  }

  async disable(id: number): Promise<LocalityResponseDto> {
    const locality = await this.findLocality(id);
    if (!locality.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La localidad "${locality.name}" ya está desactivada`,
      );
    }
    await this.localityRepository.update(id, { active: false });
    return this.findOne(id);
  }

  async enable(id: number): Promise<LocalityResponseDto> {
    const locality = await this.findLocality(id);
    if (locality.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La localidad "${locality.name}" ya está activa`,
      );
    }
    const venue = await this.venuesService.findOne(locality.venue.id);
    ensureAvailable(venue, `activar la localidad "${locality.name}"`);
    await this.localityRepository.update(id, { active: true });
    return this.findOne(id);
  }

  // Eliminar la localidad no toca su escenario. Antes se revisa si tiene boletos o precios en algún
  // partido (HU-GE-03, criterio 8): los boletos son historial, así que con ellos solo queda desactivarla.
  async remove(id: number): Promise<void> {
    const locality = await this.findLocality(id); // 404 si no existe

    const tickets = await this.ticketUsage.countForLocality(id);
    if (tickets > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${locality.name}" porque tiene boletos (${tickets}). Desactívala en su lugar`,
      );
    }
    const prices = await this.ticketUsage.countPricesForLocality(id);
    if (prices > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${locality.name}" porque tiene precio en la venta de entradas de ${prices} ${prices === 1 ? 'partido' : 'partidos'}. Quítala de esa venta primero o desactívala`,
      );
    }

    await this.localityRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  private async findLocality(id: number): Promise<Locality> {
    const locality = await this.localityRepository.findOne({
      where: { id },
      relations: { venue: true },
    });
    if (!locality) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe la localidad con id ${id}`,
      );
    }
    return locality;
  }

  // Un escenario no tiene dos localidades con el mismo nombre (la base no distingue mayúsculas ni
  // tildes). Al editar, el nombre puede seguir siendo el suyo.
  private async ensureNameAvailable(
    venueId: number,
    venueName: string,
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.localityRepository.findOneBy({
      venue: { id: venueId },
      name,
    });
    if (existing && existing.id !== excludeId) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `"${venueName}" ya tiene una localidad llamada "${existing.name}"`,
      );
    }
  }
}

// Las localidades solo se agregan o activan en un escenario que se puede usar: activo y, si está
// dentro de otro, ese también activo.
function ensureAvailable(venue: VenueResponseDto, action: string): void {
  if (venue.available) {
    return;
  }
  const reason =
    venue.active && venue.parent
      ? `El escenario "${venue.name}" está dentro de "${venue.parent.name}", que está desactivado`
      : `El escenario "${venue.name}" está desactivado`;
  throw new ApplicationException(
    ErrorCase.INVALID_OPERATION,
    `${reason}: actívalo antes de ${action}`,
  );
}
