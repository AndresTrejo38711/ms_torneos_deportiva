import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Locality } from '../../localities/entities/locality.entity';
import { Match } from '../../matches/entities/match.entity';
import { TournamentVenue } from '../../tournament-venues/entities/tournament-venue.entity';

// HU-GE-01. Lugar donde se juegan los partidos. Un escenario puede tener otros adentro, a un solo
// nivel: el coliseo múltiple se parte en una cancha de tenis, una de baloncesto y una de futsal. Es
// una relación 1:N de la tabla consigo misma, como los subdeportes.
//
// El nombre no lleva restricción única en la base: se repite entre ciudades ("Coliseo Municipal") y
// entre coliseos ("Cancha 1"). El service revisa que no se repita en la misma ciudad ni dentro del
// mismo escenario.
@Entity({ name: 'venues' })
export class Venue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  name: string;

  // Dónde queda. Solo la guardan los escenarios principales: uno de adentro usa la dirección y la
  // ciudad del que lo contiene, para no guardar el mismo dato dos veces.
  @Column({ type: 'varchar', length: 150, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  city: string | null;

  // Opcional: qué tiene el escenario (gradería cubierta, iluminación, superficie...).
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // Opcional: la foto, como imagen pequeña en texto ("data:image/webp;base64,..."), igual que el
  // escudo del equipo. No se trae por defecto (select: false): solo la piden las consultas del
  // escenario, no las que lo traen de paso (las localidades, el escenario que contiene a otro...).
  @Column({ type: 'mediumtext', nullable: true, select: false })
  photo: string | null;

  // Desactivar es la alternativa a eliminar cuando el escenario ya tiene información asociada.
  @Column({ default: true })
  active: boolean;

  // Escenario que contiene a este; null si es un escenario principal. La llave foránea parent_id
  // queda en esta tabla (lado "muchos" de la relación).
  @ManyToOne(() => Venue, (venue) => venue.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'parent_id',
    foreignKeyConstraintName: 'fk_venue_parent',
  })
  parent: Venue | null;

  // Los escenarios de adentro. No crea columnas: se arma con parent_id.
  @OneToMany(() => Venue, (venue) => venue.parent)
  children: Venue[];

  // HU-GE-03. Zonas del público (Norte, Sur, VIP...). La llave foránea venue_id está en localities.
  @OneToMany(() => Locality, (locality) => locality.venue)
  localities: Locality[];

  // HU-GE-02. Torneos a los que está asignado, a través de la tabla intermedia tournament_venues.
  @OneToMany(() => TournamentVenue, (tournamentVenue) => tournamentVenue.venue)
  tournamentVenues: TournamentVenue[];

  // HU-GC-06 (criterio 11). Partidos que se juegan aquí. La llave foránea venue_id está en matches.
  @OneToMany(() => Match, (match) => match.venue)
  matches: Match[];
}
