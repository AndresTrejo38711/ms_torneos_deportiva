import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Phase } from '../../phases/entities/phase.entity';
import { Sport } from '../../sports/entities/sport.entity';
import { TournamentTeam } from '../../tournament-teams/entities/tournament-team.entity';
import { TournamentCategory } from './tournament-category.enum';

// HU-GC-01. Competencia de un deporte. Su estado (por iniciar, en curso, finalizado) no se guarda:
// se calcula con sus fechas cada vez que se consulta (tournament-status.ts).
@Entity({ name: 'tournaments' })
// Como en deportes y equipos, la base no distingue mayúsculas ni tildes:
// "Copa Manizales 2026" y "COPA MANIZALES 2026" cuentan como el mismo nombre.
@Unique('uk_tournament_name', ['name'])
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  name: string;

  // Cada torneo pertenece a un deporte registrado. La llave foránea sport_id vive aquí.
  // RESTRICT: la base no deja borrar un deporte que todavía tenga torneos.
  @ManyToOne(() => Sport, (sport) => sport.tournaments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'sport_id',
    foreignKeyConstraintName: 'fk_tournament_sport',
  })
  sport: Sport;

  // En MySQL queda como ENUM('MASCULINO','FEMENINO','MIXTO').
  @Column({ type: 'enum', enum: TournamentCategory })
  category: TournamentCategory;

  // Columnas DATE: TypeORM las entrega como texto "AAAA-MM-DD", sin hora ni zona horaria.
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  // Fecha estimada de fin ("Final estimada" en el mockup).
  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  // Opcional: último día para inscribir o retirar equipos. Sin ella, las inscripciones se cierran
  // cuando el torneo empieza.
  @Column({ name: 'registration_deadline', type: 'date', nullable: true })
  registrationDeadline: string | null;

  // Opcional: el logo, como imagen pequeña en texto ("data:image/webp;base64,..."). No se trae por
  // defecto (select: false): solo lo piden la lista y el detalle de torneos (y el desarrollo, que usa
  // el detalle), no las respuestas que traen el torneo de paso (inscripciones, fases, partidos...).
  @Column({ type: 'mediumtext', nullable: true, select: false })
  logo: string | null;

  // Desactivar es la alternativa a eliminar cuando el torneo ya tiene información asociada.
  @Column({ default: true })
  active: boolean;

  // HU-GC-02. Equipos inscritos, a través de la tabla intermedia tournament_teams.
  // No crea columnas aquí: la llave foránea tournament_id está en tournament_teams.
  @OneToMany(
    () => TournamentTeam,
    (tournamentTeam) => tournamentTeam.tournament,
  )
  tournamentTeams: TournamentTeam[];

  // HU-GC-03. Sus fases (de grupos y finales). La llave foránea tournament_id está en phases.
  @OneToMany(() => Phase, (phase) => phase.tournament)
  phases: Phase[];
}
