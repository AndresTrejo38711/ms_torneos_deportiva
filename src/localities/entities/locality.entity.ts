import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';

// HU-GE-03. Zona de un escenario destinada al público (Norte, Sur, VIP...). Pertenece al escenario
// donde está: si se juega en la cancha de tenis del coliseo, se venden las localidades de esa cancha.
// El precio no va aquí: se fija por partido y localidad al habilitar la venta (HU-GE-04).
@Entity({ name: 'localities' })
// Un escenario no puede tener dos localidades con el mismo nombre. La base no distingue mayúsculas
// ni tildes: "Oriental" y "ORIENTAL" cuentan como la misma.
@Unique('uk_locality_venue_name', ['venue', 'name'])
export class Locality {
  @PrimaryGeneratedColumn()
  id: number;

  // RESTRICT: no se borra un escenario que todavía tenga localidades.
  @ManyToOne(() => Venue, (venue) => venue.localities, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'venue_id',
    foreignKeyConstraintName: 'fk_locality_venue',
  })
  venue: Venue;

  @Column({ length: 60 })
  name: string;

  // Cuántas personas caben: el tope de boletos de la localidad en cada partido (HU-GE-04).
  @Column({ type: 'int' })
  capacity: number;

  // Opcional: cómo es (cubierta, numerada, acceso por la puerta 3...).
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // Desactivar es la alternativa a eliminar: una localidad inactiva no se ofrece en la venta.
  @Column({ default: true })
  active: boolean;
}
