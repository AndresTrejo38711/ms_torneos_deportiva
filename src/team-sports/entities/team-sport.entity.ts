import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Sport } from '../../sports/entities/sport.entity';
import { Team } from '../../teams/entities/team.entity';

// HU-GD-03. Tabla intermedia de la relación N:N entre equipos y deportes: cada fila dice
// "este equipo participa en este deporte". Un equipo puede tener muchos deportes y un deporte
// muchos equipos; la tabla intermedia parte esa N:N en dos relaciones 1:N.
@Entity({ name: 'team_sports' })
// No se puede registrar dos veces el mismo par equipo–deporte.
@Unique('uk_team_sport', ['team', 'sport'])
export class TeamSport {
  @PrimaryGeneratedColumn()
  id: number;

  // Muchas filas de esta tabla apuntan al mismo equipo. La llave foránea team_id vive aquí.
  // RESTRICT: la base no deja borrar un equipo que todavía tenga deportes asociados.
  @ManyToOne(() => Team, (team) => team.teamSports, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'fk_team_sport_team',
  })
  team: Team;

  // Lo mismo con el deporte: llave foránea sport_id.
  @ManyToOne(() => Sport, (sport) => sport.teamSports, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'sport_id',
    foreignKeyConstraintName: 'fk_team_sport_sport',
  })
  sport: Sport;
}
