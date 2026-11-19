import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { Team } from '../../teams/entities/team.entity';

// HU-GC-04. Tabla intermedia de la relación N:N entre grupos y equipos: un grupo tiene varios
// equipos, y un equipo puede estar en grupos de distintas fases o torneos (pero en uno solo por
// fase: eso lo revisa el service).
@Entity({ name: 'group_teams' })
// No se puede registrar dos veces el mismo equipo en el mismo grupo.
@Unique('uk_group_team', ['group', 'team'])
export class GroupTeam {
  @PrimaryGeneratedColumn()
  id: number;

  // CASCADE: al eliminar un grupo se borran sus filas aquí (los equipos salen del grupo), pero los
  // equipos siguen registrados en la plataforma.
  @ManyToOne(() => Group, (group) => group.groupTeams, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'group_id',
    foreignKeyConstraintName: 'fk_group_team_group',
  })
  group: Group;

  // RESTRICT: no se borra un equipo que esté en un grupo.
  @ManyToOne(() => Team, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'fk_group_team_team',
  })
  team: Team;
}
