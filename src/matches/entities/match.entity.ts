import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { LOCAL_DATE_TIME } from '../../common/persistence/local-date-time.transformer';
import { Phase } from '../../phases/entities/phase.entity';
import { Team } from '../../teams/entities/team.entity';
import { MatchStatus } from './match-status.enum';

// HU-GC-06. Encuentro entre dos equipos dentro de una fase de un torneo.
//
// Como en el diagrama, el partido solo apunta a su fase: el torneo sale de la fase, y en una fase de
// grupos el grupo sale de los equipos (los dos deben estar en el mismo). Así no se guarda nada que
// se pueda contradecir.
@Entity({ name: 'matches' })
// En una fase final, cada posición de la llave tiene un solo partido. En las fases de grupos la
// posición queda en null, y MySQL permite varios null en una columna única.
@Unique('uk_match_phase_bracket', ['phase', 'bracketPosition'])
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  // RESTRICT: no se borra una fase que tenga partidos.
  @ManyToOne(() => Phase, (phase) => phase.matches, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'phase_id', foreignKeyConstraintName: 'fk_match_phase' })
  phase: Phase;

  @ManyToOne(() => Team, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'home_team_id',
    foreignKeyConstraintName: 'fk_match_home_team',
  })
  homeTeam: Team;

  @ManyToOne(() => Team, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'away_team_id',
    foreignKeyConstraintName: 'fk_match_away_team',
  })
  awayTeam: Team;

  // Fecha y hora local: "2030-02-10T18:00".
  @Column({
    name: 'scheduled_at',
    type: 'datetime',
    transformer: LOCAL_DATE_TIME,
  })
  scheduledAt: string;

  // Solo en fase de grupos, y opcional: la jornada ("Jornada 3" en el mockup de la HU-GC-08).
  @Column({ type: 'int', nullable: true })
  round: number | null;

  // Solo en fase final, y obligatoria: el lugar del partido en la llave, de 1 a la mitad de los
  // equipos de la fase. Los ganadores de las posiciones 1 y 2 se cruzan en la posición 1 de la fase
  // siguiente, los de 3 y 4 en la 2, y así.
  @Column({ name: 'bracket_position', type: 'int', nullable: true })
  bracketPosition: number | null;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.PROGRAMADO })
  status: MatchStatus;
}
