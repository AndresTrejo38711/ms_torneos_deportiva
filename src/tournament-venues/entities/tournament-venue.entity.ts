import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Venue } from '../../venues/entities/venue.entity';

// HU-GE-02. Escenario asignado a un torneo: la tabla intermedia de la relación N:N entre torneos y
// escenarios ("Escenario Torneo" en el diagrama). Un torneo usa varios escenarios y un escenario
// sirve a varios torneos. Los partidos del torneo solo se juegan en sus escenarios.
@Entity({ name: 'tournament_venues' })
// No se puede asignar dos veces el mismo escenario al mismo torneo.
@Unique('uk_tournament_venue', ['tournament', 'venue'])
export class TournamentVenue {
  @PrimaryGeneratedColumn()
  id: number;

  // RESTRICT: no se borra un torneo que todavía tenga escenarios asignados.
  @ManyToOne(() => Tournament, (tournament) => tournament.tournamentVenues, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'tournament_id',
    foreignKeyConstraintName: 'fk_tournament_venue_tournament',
  })
  tournament: Tournament;

  // Lo mismo con el escenario: no se borra uno asignado a algún torneo.
  @ManyToOne(() => Venue, (venue) => venue.tournamentVenues, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'venue_id',
    foreignKeyConstraintName: 'fk_tournament_venue_venue',
  })
  venue: Venue;
}
