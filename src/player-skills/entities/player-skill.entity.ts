import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Player } from '../../players/entities/player.entity';
import { Skill } from '../../skills/entities/skill.entity';

// HU-GD-07. Tabla intermedia de la relación N:N entre jugadores y habilidades: un jugador tiene
// varias habilidades y una habilidad la tienen varios jugadores. Igual que team_sports.
@Entity({ name: 'player_skills' })
// No se puede asignar dos veces la misma habilidad al mismo jugador.
@Unique('uk_player_skill', ['player', 'skill'])
export class PlayerSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Player, (player) => player.playerSkills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'player_id',
    foreignKeyConstraintName: 'fk_player_skill_player',
  })
  player: Player;

  @ManyToOne(() => Skill, (skill) => skill.playerSkills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'skill_id',
    foreignKeyConstraintName: 'fk_player_skill_skill',
  })
  skill: Skill;
}
