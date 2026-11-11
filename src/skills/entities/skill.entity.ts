import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PlayerSkill } from '../../player-skills/entities/player-skill.entity';

// HU-GD-06. Catálogo de capacidades deportivas que se asignan a los jugadores (velocidad,
// regate, visión de juego...). La HU solo pide eliminar, así que no lleva activar/desactivar.
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

  // HU-GD-07. Jugadores que tienen esta habilidad. La llave foránea skill_id está en
  // player_skills.
  @OneToMany(() => PlayerSkill, (playerSkill) => playerSkill.skill)
  playerSkills: PlayerSkill[];
}
