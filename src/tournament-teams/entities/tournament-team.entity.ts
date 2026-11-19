import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';

// HU-GC-02. Inscripción de un equipo en un torneo: la tabla intermedia de la relación N:N entre
// torneos y equipos ("Inscripción" en el diagrama). Un torneo tiene muchos equipos inscritos y un
// equipo puede estar inscrito en muchos torneos.
@Entity({ name: 'tournament_teams' })
// No se puede inscribir dos veces el mismo equipo en el mismo torneo.
@Unique('uk_tournament_team', ['tournament', 'team'])
export class TournamentTeam {
  @PrimaryGeneratedColumn()
  id: number;

  // RESTRICT: la base no deja borrar un torneo que todavía tenga equipos inscritos.
  @ManyToOne(() => Tournament, (tournament) => tournament.tournamentTeams, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'tournament_id',
    foreignKeyConstraintName: 'fk_tournament_team_tournament',
  })
  tournament: Tournament;

  // Lo mismo con el equipo: no se borra un equipo inscrito en algún torneo.
  @ManyToOne(() => Team, (team) => team.tournamentTeams, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'fk_tournament_team_team',
  })
  team: Team;

  // Día en que se hizo la inscripción.
  @Column({ name: 'registered_at', type: 'date' })
  registeredAt: string;
}
