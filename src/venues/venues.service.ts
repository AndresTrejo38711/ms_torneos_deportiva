import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { MatchUsageService } from '../matches/match-usage.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { VenueResponseDto } from './dto/venue-response.dto';
import { Venue } from './entities/venue.entity';
import { toVenueResponse } from './venues.mapper';

// HU-GE-01 · Gestionar escenarios deportivos. Las localidades de cada escenario se gestionan en
// localities (HU-GE-03); aquí solo se cuentan para la capacidad y para no eliminar uno que las tenga.
@Injectable()
export class VenuesService {
  // MatchUsageService dice cuántos partidos usa el escenario; no depende de nadie, así que no forma
  // ciclos con los partidos, que validan su escenario con este service.
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    private readonly matchUsage: MatchUsageService,
  ) {}

  async create(dto: CreateVenueDto): Promise<VenueResponseDto> {
    const parent = dto.parentId
      ? await this.findValidParent(dto.parentId)
      : null;
    await this.ensureNameAvailable(dto.name, dto.city ?? null, parent);

    const saved = await this.venueRepository.save(
      this.venueRepository.create({
        name: dto.name,
        // Uno de adentro usa la dirección y la ciudad del que lo contiene.
        address: parent ? null : (dto.address ?? null),
        city: parent ? null : (dto.city ?? null),
        description: dto.description || null,
        photo: dto.photo || null,
        parent: parent ? { id: parent.id } : null,
      }),
    );

    return this.findOne(saved.id);
  }

  // Todos los escenarios, principales y de adentro, ordenados por nombre.
  async findAll(): Promise<VenueResponseDto[]> {
    const venues = await this.summaryQuery()
      .orderBy('venue.name', 'ASC')
      .getMany();
    return venues.map(toVenueResponse);
  }

  async findOne(id: number): Promise<VenueResponseDto> {
    return toVenueResponse(await this.findVenue(id));
  }

  async update(id: number, dto: UpdateVenueDto): Promise<VenueResponseDto> {
    const venue = await this.findVenue(id);

    // El escenario que lo contiene solo se valida si cambia: puede conservar el que ya tenía.
    const newParentId = dto.parentId ?? null;
    let parent = venue.parent;
    if (newParentId !== (venue.parent?.id ?? null)) {
      parent = newParentId
        ? await this.findValidNewParent(venue, newParentId)
        : null;
    }
    await this.ensureNameAvailable(dto.name, dto.city ?? null, parent, id);

    await this.venueRepository.update(id, {
      name: dto.name,
      address: parent ? null : (dto.address ?? null),
      city: parent ? null : (dto.city ?? null),
      description: dto.description || null,
      photo: dto.photo || null,
      parent: parent ? { id: parent.id } : null,
    });

    return this.findOne(id);
  }

  // Al desactivar un escenario, los de adentro quedan no disponibles mientras siga desactivado
  // (available se calcula): no hace falta desactivarlos uno por uno.
  async disable(id: number): Promise<VenueResponseDto> {
    const venue = await this.findVenue(id);
    if (!venue.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El escenario "${venue.name}" ya está desactivado`,
      );
    }
    await this.venueRepository.update(id, { active: false });
    return this.findOne(id);
  }

  async enable(id: number): Promise<VenueResponseDto> {
    const venue = await this.findVenue(id);
    if (venue.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El escenario "${venue.name}" ya está activo`,
      );
    }
    if (venue.parent && !venue.parent.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${venue.name}" está dentro de "${venue.parent.name}", que está desactivado: activa primero "${venue.parent.name}"`,
      );
    }
    await this.venueRepository.update(id, { active: true });
    return this.findOne(id);
  }

  // Solo se elimina si no tiene escenarios adentro, localidades, torneos (HU-GE-02) ni partidos
  // (HU-GC-06); si los tiene, se dice cuáles y se sugiere desactivarlo.
  async remove(id: number): Promise<void> {
    const venue = await this.findVenue(id);

    if (venue.children.length > 0) {
      const names = namesOf(venue.children);
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${venue.name}" porque tiene escenarios adentro (${names}). Elimínalos primero o desactiva el escenario`,
      );
    }

    if (venue.localities.length > 0) {
      const names = namesOf(venue.localities);
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${venue.name}" porque tiene localidades (${names}). Elimínalas primero o desactiva el escenario`,
      );
    }

    const withTournaments = await this.venueRepository.findOne({
      where: { id },
      relations: { tournamentVenues: { tournament: true } },
    });
    const tournaments = (withTournaments?.tournamentVenues ?? []).map(
      (row) => row.tournament,
    );
    if (tournaments.length > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${venue.name}" porque está asignado a torneos (${namesOf(tournaments)}). Retíralo de esos torneos primero o desactiva el escenario`,
      );
    }

    // Los partidos son historial: con ellos solo queda desactivar.
    const matches = await this.matchUsage.countInVenue(id);
    if (matches > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${venue.name}" porque tiene partidos (${matches}). Desactívalo en su lugar`,
      );
    }

    await this.venueRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  private async findVenue(id: number): Promise<Venue> {
    const venue = await this.summaryQuery()
      .where('venue.id = :id', { id })
      .getOne();
    if (!venue) {
      throw notFound(id);
    }
    return venue;
  }

  // Lo que necesita la respuesta: el escenario que lo contiene (de ahí salen la dirección y la ciudad
  // de uno de adentro), los de adentro, las localidades y la foto, que no viene por defecto. El
  // mapper ordena por nombre los de adentro y las localidades.
  private summaryQuery() {
    return this.venueRepository
      .createQueryBuilder('venue')
      .addSelect('venue.photo')
      .leftJoinAndSelect('venue.parent', 'parent')
      .leftJoinAndSelect('venue.children', 'child')
      .leftJoinAndSelect('venue.localities', 'locality');
  }

  // El nombre no se repite en la misma ciudad (entre principales) ni dentro del mismo escenario
  // (entre los de adentro). La base no distingue mayúsculas ni tildes. Al editar, el nombre puede
  // seguir siendo el suyo.
  private async ensureNameAvailable(
    name: string,
    city: string | null,
    parent: Venue | null,
    excludeId?: number,
  ): Promise<void> {
    const existing = parent
      ? await this.venueRepository.findOneBy({
          name,
          parent: { id: parent.id },
        })
      : await this.venueRepository.findOneBy({
          name,
          city: city ?? '',
          parent: IsNull(),
        });
    if (!existing || existing.id === excludeId) {
      return;
    }
    throw new ApplicationException(
      ErrorCase.ALREADY_EXISTS,
      parent
        ? `"${parent.name}" ya tiene adentro un escenario llamado "${existing.name}"`
        : `Ya existe un escenario llamado "${existing.name}" en ${existing.city}`,
    );
  }

  // Un solo nivel: el escenario que contiene a otro debe existir, estar activo y ser principal.
  private async findValidParent(parentId: number): Promise<Venue> {
    const parent = await this.venueRepository.findOne({
      where: { id: parentId },
      relations: { parent: true },
    });
    if (!parent) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe el escenario con id ${parentId} para contener a este`,
      );
    }
    if (parent.parent) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${parent.name}" ya está dentro de "${parent.parent.name}": un escenario de adentro no puede tener otros adentro`,
      );
    }
    if (!parent.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El escenario "${parent.name}" está desactivado`,
      );
    }
    return parent;
  }

  // Al editar, además: no puede quedar dentro de sí mismo, y uno que ya tiene escenarios adentro no
  // puede quedar dentro de otro (serían dos niveles).
  private async findValidNewParent(
    venue: Venue,
    parentId: number,
  ): Promise<Venue> {
    if (parentId === venue.id) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${venue.name}" no puede quedar dentro de sí mismo`,
      );
    }
    if (venue.children.length > 0) {
      const names = namesOf(venue.children);
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${venue.name}" tiene escenarios adentro (${names}): no puede quedar dentro de otro escenario`,
      );
    }
    return this.findValidParent(parentId);
  }
}

// "Cancha de baloncesto, Cancha de tenis": los nombres en orden alfabético, para los mensajes.
function namesOf(items: { name: string }[]): string {
  return items
    .map((item) => item.name)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .join(', ');
}

function notFound(id: number): ApplicationException {
  return new ApplicationException(
    ErrorCase.NOT_FOUND,
    `No existe el escenario con id ${id}`,
  );
}
