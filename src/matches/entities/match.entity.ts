import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { DECIMAL_NUMBER } from '../../common/persistence/decimal.transformer';
import { LOCAL_DATE_TIME } from '../../common/persistence/local-date-time.transformer';
import { Phase } from '../../phases/entities/phase.entity';
import { Team } from '../../teams/entities/team.entity';
import { Venue } from '../../venues/entities/venue.entity';
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

  // HU-GC-06 (criterio 11) y HU-GE-02. Escenario donde se juega; opcional. Debe ser uno de los
  // escenarios asignados a su torneo. RESTRICT: no se borra un escenario que tenga partidos.
  @ManyToOne(() => Venue, (venue) => venue.matches, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'venue_id', foreignKeyConstraintName: 'fk_match_venue' })
  venue: Venue | null;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.PROGRAMADO })
  status: MatchStatus;

  // HU-GC-07. Resultado oficial: lo registra el administrador y con él el partido queda FINALIZADO.
  // En el diagrama no hay clase Resultado: es parte del partido. Null mientras está pendiente.
  @Column({ name: 'home_score', type: 'int', nullable: true })
  homeScore: number | null;

  @Column({ name: 'away_score', type: 'int', nullable: true })
  awayScore: number | null;

  // Solo en fase final con el marcador empatado: ahí no hay empate, se define por penales.
  @Column({ name: 'home_penalties', type: 'int', nullable: true })
  homePenalties: number | null;

  @Column({ name: 'away_penalties', type: 'int', nullable: true })
  awayPenalties: number | null;

  // HU-GC-11. Cuotas que fija el administrador (null hasta que las fija). Una apuesta guarda la cuota
  // del momento en que se hizo, así que cambiarlas aquí no cambia las apuestas ya hechas.
  @Column({
    name: 'home_odds',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: DECIMAL_NUMBER,
  })
  homeOdds: number | null;

  // Solo en fase de grupos: en una fase final no hay empate.
  @Column({
    name: 'draw_odds',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: DECIMAL_NUMBER,
  })
  drawOdds: number | null;

  @Column({
    name: 'away_odds',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: DECIMAL_NUMBER,
  })
  awayOdds: number | null;

  // Si recibe apuestas nuevas. Además debe estar programado y no haber llegado su hora.
  @Column({ name: 'betting_open', default: false })
  bettingOpen: boolean;

  // HU-GE-04 (Anexo 4). Si vende boletos: lo abre o lo cierra el administrador. Los precios de cada
  // localidad están en ticket_prices.
  @Column({ name: 'ticket_sales_open', default: false })
  ticketSalesOpen: boolean;
}
