import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { GroupTeam } from '../../group-teams/entities/group-team.entity';
import { GroupPhase } from '../../phases/entities/group-phase.entity';

// HU-GC-04. Grupo de una fase de grupos ("Grupo A", "Grupo B"...). La tabla no se llama "groups"
// porque GROUPS es palabra reservada de MySQL 8.
@Entity({ name: 'tournament_groups' })
// Una fase no puede tener dos grupos con el mismo nombre.
@Unique('uk_group_phase_name', ['phase', 'name'])
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  // Solo una fase de grupos tiene grupos: la relación apunta a la clase hija GroupPhase.
  // RESTRICT: no se borra una fase que todavía tenga grupos.
  @ManyToOne(() => GroupPhase, (phase) => phase.groups, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'phase_id', foreignKeyConstraintName: 'fk_group_phase' })
  phase: GroupPhase;

  @Column({ length: 30 })
  name: string;

  // Equipos que conforman el grupo, a través de la tabla intermedia group_teams.
  @OneToMany(() => GroupTeam, (groupTeam) => groupTeam.group)
  groupTeams: GroupTeam[];
}
