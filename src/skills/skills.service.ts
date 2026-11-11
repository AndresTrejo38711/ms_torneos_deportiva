import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { CreateSkillDto } from './dto/create-skill.dto';
import { SkillResponseDto } from './dto/skill-response.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { Skill } from './entities/skill.entity';
import { toSkillResponse } from './skills.mapper';

// HU-GD-06 · Gestionar habilidades.
@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
  ) {}

  async create(dto: CreateSkillDto): Promise<SkillResponseDto> {
    await this.ensureNameAvailable(dto.name);

    const skill = this.skillRepository.create({
      name: dto.name,
      description: dto.description || null,
    });
    const saved = await this.skillRepository.save(skill);

    return this.findOne(saved.id);
  }

  async findAll(): Promise<SkillResponseDto[]> {
    const skills = await this.skillRepository.find({ order: { name: 'ASC' } });
    return skills.map(toSkillResponse);
  }

  async findOne(id: number): Promise<SkillResponseDto> {
    return toSkillResponse(await this.findSkill(id));
  }

  async update(id: number, dto: UpdateSkillDto): Promise<SkillResponseDto> {
    const skill = await this.findSkill(id);
    await this.ensureNameAvailable(dto.name, id);

    skill.name = dto.name;
    skill.description = dto.description || null;
    await this.skillRepository.save(skill);

    return this.findOne(id);
  }

  // Se elimina solo si no está asignada a ningún jugador. Si lo está, se informa a cuántos y
  // se indica que primero hay que retirársela (HU-GD-07).
  async remove(id: number): Promise<void> {
    const skill = await this.skillRepository.findOne({
      where: { id },
      relations: { playerSkills: true },
    });
    if (!skill) {
      throw notFound(id);
    }

    const players = skill.playerSkills.length;
    if (players > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar "${skill.name}" porque está asignada a ${players} ${players === 1 ? 'jugador' : 'jugadores'}. Retírasela primero a ${players === 1 ? 'ese jugador' : 'esos jugadores'}`,
      );
    }

    await this.skillRepository.delete(id);
  }

  // ---------------------------------------------------------------------------------------------

  private async findSkill(id: number): Promise<Skill> {
    const skill = await this.skillRepository.findOneBy({ id });
    if (!skill) {
      throw notFound(id);
    }
    return skill;
  }

  // No se permiten habilidades duplicadas. Al editar, el nombre puede seguir siendo el suyo.
  private async ensureNameAvailable(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.skillRepository.findOneBy({ name });
    if (existing && existing.id !== excludeId) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe una habilidad llamada "${existing.name}"`,
      );
    }
  }
}

function notFound(id: number): ApplicationException {
  return new ApplicationException(
    ErrorCase.NOT_FOUND,
    `No existe la habilidad con id ${id}`,
  );
}
