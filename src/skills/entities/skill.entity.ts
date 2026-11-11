import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PlayerSkill } from '../../player-skills/entities/player-skill.entity';
import { SkillCategory } from './skill-category.enum';

// HU-GD-06. Catálogo de capacidades deportivas que se asignan a los jugadores (velocidad,
// regate, visión de juego...).
@Entity({ name: 'skills' })
// La base no distingue mayúsculas ni tildes: "Visión de juego" y "VISION DE JUEGO" chocan.
@Unique('uk_skill_name', ['name'])
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // En MySQL queda como ENUM('FISICA','TECNICA','TACTICA','MENTAL'). Si la tabla ya tenía
  // habilidades cuando se agregó la columna, MySQL les puso la primera (FISICA).
  @Column({ type: 'enum', enum: SkillCategory })
  category: SkillCategory;

  // La HU pide eliminar; desactivar es la alternativa cuando la habilidad ya está asignada:
  // los jugadores que la tienen la conservan, pero no se puede asignar a nadie más.
  @Column({ default: true })
  active: boolean;

  // HU-GD-07. Jugadores que tienen esta habilidad. La llave foránea skill_id está en
  // player_skills.
  @OneToMany(() => PlayerSkill, (playerSkill) => playerSkill.skill)
  playerSkills: PlayerSkill[];
}
