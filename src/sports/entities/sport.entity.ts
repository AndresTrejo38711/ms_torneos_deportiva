import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TeamSport } from '../../team-sports/entities/team-sport.entity';

// HU-GD-01. Un deporte puede tener subdeportes, que también son deportes:
// Fútbol → Fútbol de salón, Fútbol callejero. Es una relación 1:N de la tabla consigo misma.
@Entity({ name: 'sports' })
// La base usa utf8mb4_0900_ai_ci, que no distingue mayúsculas ni tildes:
// "Fútbol" y "futbol" cuentan como el mismo nombre.
@Unique('uk_sport_name', ['name'])
export class Sport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // Desactivar es la alternativa a eliminar cuando el deporte ya tiene información asociada.
  @Column({ default: true })
  active: boolean;

  // Deporte del que este es subdeporte; null si es un deporte principal.
  // La llave foránea parent_id queda en esta tabla (lado "muchos" de la relación).
  @ManyToOne(() => Sport, (sport) => sport.subSports, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'parent_id',
    foreignKeyConstraintName: 'fk_sport_parent',
  })
  parent: Sport | null;

  // El otro lado de la misma relación: no crea columnas, se arma con parent_id.
  @OneToMany(() => Sport, (sport) => sport.parent)
  subSports: Sport[];

  // HU-GD-03. Equipos que participan en este deporte, a través de la tabla intermedia.
  // Tampoco crea columnas: la llave foránea sport_id está en team_sports.
  @OneToMany(() => TeamSport, (teamSport) => teamSport.sport)
  teamSports: TeamSport[];
}
