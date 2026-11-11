import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { CreateSportDto } from './dto/create-sport.dto';
import { SportResponseDto } from './dto/sport-response.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { Sport } from './entities/sport.entity';
import { toSportResponse } from './sports.mapper';

// HU-GD-01 · Gestionar deportes.
@Injectable()
export class SportsService {
  // El repository lo da TypeORM (como un JpaRepository): no hace falta escribir su clase.
  constructor(
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
  ) {}

  async create(dto: CreateSportDto): Promise<SportResponseDto> {
    await this.ensureNameAvailable(dto.name);

    const sport = this.sportRepository.create({
      name: dto.name,
      description: dto.description || null,
      parent: dto.parentId ? await this.findActiveParent(dto.parentId) : null,
    });
    const saved = await this.sportRepository.save(sport);

    return this.findOne(saved.id);
  }

  // Todos los deportes, principales y subdeportes, ordenados por nombre.
  async findAll(): Promise<SportResponseDto[]> {
    const sports = await this.sportRepository.find({
      relations: { parent: true, subSports: true },
      order: { name: 'ASC', subSports: { name: 'ASC' } },
    });
    return sports.map(toSportResponse);
  }

  async findOne(id: number): Promise<SportResponseDto> {
    const sport = await this.sportRepository.findOne({
      where: { id },
      relations: { parent: true, subSports: true },
      order: { subSports: { name: 'ASC' } },
    });
    if (!sport) {
      throw notFound(id);
    }
    return toSportResponse(sport);
  }

  async update(id: number, dto: UpdateSportDto): Promise<SportResponseDto> {
    const sport = await this.sportRepository.findOne({
      where: { id },
      relations: { parent: true },
    });
    if (!sport) {
      throw notFound(id);
    }

    await this.ensureNameAvailable(dto.name, id);

    // El padre solo se valida si cambia: un deporte puede conservar el padre que ya tenía.
    const newParentId = dto.parentId ?? null;
    if (newParentId !== (sport.parent?.id ?? null)) {
      sport.parent = newParentId
        ? await this.findValidNewParent(sport, newParentId)
        : null;
    }

    sport.name = dto.name;
    sport.description = dto.description || null;
    await this.sportRepository.save(sport);

    return this.findOne(id);
  }

  async disable(id: number): Promise<SportResponseDto> {
    const sport = await this.findSport(id);
    if (!sport.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El deporte "${sport.name}" ya está desactivado`,
      );
    }
    sport.active = false;
    await this.sportRepository.save(sport);
    return this.findOne(id);
  }

  async enable(id: number): Promise<SportResponseDto> {
    const sport = await this.findSport(id);
    if (sport.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El deporte "${sport.name}" ya está activo`,
      );
    }
    sport.active = true;
    await this.sportRepository.save(sport);
    return this.findOne(id);
  }

  // Solo se elimina si no tiene información asociada; si la tiene, se informa qué es y se sugiere
  // desactivarlo. (Cuando existan los equipos, HU-GD-03, también se revisarán aquí.)
  async remove(id: number): Promise<void> {
    const sport = await this.sportRepository.findOne({
      where: { id },
      relations: { subSports: true },
    });
    if (!sport) {
      throw notFound(id);
    }

    if (sport.subSports.length > 0) {
      const names = sport.subSports.map((sub) => sub.name).join(', ');
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${sport.name}" porque tiene subdeportes (${names}). Elimínalos primero o desactiva el deporte`,
      );
    }

    await this.sportRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  private async findSport(id: number): Promise<Sport> {
    const sport = await this.sportRepository.findOneBy({ id });
    if (!sport) {
      throw notFound(id);
    }
    return sport;
  }

  // No se permiten deportes duplicados. Al editar, el nombre puede seguir siendo el suyo.
  private async ensureNameAvailable(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.sportRepository.findOneBy({ name });
    if (existing && existing.id !== excludeId) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe un deporte llamado "${existing.name}"`,
      );
    }
  }

  private async findActiveParent(parentId: number): Promise<Sport> {
    const parent = await this.sportRepository.findOneBy({ id: parentId });
    if (!parent) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe el deporte padre con id ${parentId}`,
      );
    }
    if (!parent.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El deporte padre "${parent.name}" está desactivado`,
      );
    }
    return parent;
  }

  // Control de ciclos. Si Fútbol → Fútbol de salón → Futsal femenino y a Fútbol se le pone como
  // padre a Futsal femenino, la cadena de padres daría vueltas para siempre. Para evitarlo se sube
  // desde el padre nuevo, padre por padre: si en el camino aparece el deporte que se edita, se rechaza.
  private async findValidNewParent(
    sport: Sport,
    parentId: number,
  ): Promise<Sport> {
    if (parentId === sport.id) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `"${sport.name}" no puede ser subdeporte de sí mismo`,
      );
    }

    const parent = await this.findActiveParent(parentId);

    let ancestor: Sport | null = parent;
    while (ancestor) {
      if (ancestor.id === sport.id) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `"${sport.name}" no puede quedar dentro de "${parent.name}", porque "${parent.name}" es uno de sus propios subdeportes`,
        );
      }
      const withParent: Sport | null = await this.sportRepository.findOne({
        where: { id: ancestor.id },
        relations: { parent: true },
      });
      ancestor = withParent?.parent ?? null;
    }

    return parent;
  }
}

function notFound(id: number): ApplicationException {
  return new ApplicationException(
    ErrorCase.NOT_FOUND,
    `No existe el deporte con id ${id}`,
  );
}
