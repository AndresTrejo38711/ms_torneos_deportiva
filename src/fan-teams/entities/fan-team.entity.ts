import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Fan } from '../../fans/entities/fan.entity';
import { Team } from '../../teams/entities/team.entity';

// AficionadoEquipo del diagrama (HU-GE-05): un equipo que el aficionado sigue. Un aficionado sigue
// varios equipos y un equipo tiene varios aficionados (criterios 4 y 5). Dejar de seguirlo borra solo
// esta fila (criterio 10).
@Entity({ name: 'fan_teams' })
// La misma pareja no se registra dos veces (criterio 6).
@Unique('uk_fan_team', ['fan', 'team'])
export class FanTeam {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Fan, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fan_id', foreignKeyConstraintName: 'fk_fan_team_fan' })
  fan: Fan;

  // RESTRICT: un equipo con seguidores no se elimina, solo se desactiva.
  @ManyToOne(() => Team, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'fk_fan_team_team',
  })
  team: Team;

  // Desde cuándo lo sigue.
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
