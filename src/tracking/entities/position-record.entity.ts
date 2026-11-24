import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DECIMAL_NUMBER } from '../../common/persistence/decimal.transformer';
import { Match } from '../../matches/entities/match.entity';
import { Player } from '../../players/entities/player.entity';
import { Ball } from './ball.entity';

// Posición espacial del diagrama (HU-GC-09): dónde estaba un jugador o la pelota en un momento del
// partido. Actualizar una posición es registrar una nueva (la última es la actual): ninguna se
// sobrescribe, así se conserva todo el recorrido (criterio 13).
//
// Cada registro es de un jugador o de la pelota, nunca de los dos (criterio 12): lo garantiza
// TrackingService, porque MySQL con TypeORM no maneja restricciones CHECK. El diagrama no une la
// posición con el partido, pero el criterio 11 lo pide: un jugador juega muchos partidos.
@Entity({ name: 'position_records' })
// La última posición de cada jugador de un partido sale de aquí (y la llave foránea del partido
// también lo usa). InnoDB agrega el id al final de cada índice.
@Index('idx_position_match_player', ['match', 'player'])
export class PositionRecord {
  @PrimaryGeneratedColumn()
  id: number;

  // RESTRICT: un partido con posiciones no se elimina (son historial).
  @ManyToOne(() => Match, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'match_id',
    foreignKeyConstraintName: 'fk_position_match',
  })
  match: Match;

  // null cuando el registro es de la pelota.
  @ManyToOne(() => Player, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'player_id',
    foreignKeyConstraintName: 'fk_position_player',
  })
  player: Player | null;

  // null cuando el registro es de un jugador.
  @ManyToOne(() => Ball, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ball_id', foreignKeyConstraintName: 'fk_position_ball' })
  ball: Ball | null;

  // Porcentaje del ancho (x) y del alto (y) del campo, de 0 a 100 con 2 decimales: la misma escala
  // sirve para cualquier deporte. x = 0 es el arco (o la línea de fondo) del local.
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: DECIMAL_NUMBER,
  })
  x: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: DECIMAL_NUMBER,
  })
  y: number;

  // false: el jugador sale de la cancha (va al banco; ej.: el cambio con el líbero). La última posición de
  // cada jugador dice si está jugando. La pelota siempre está en cancha. Las filas viejas quedan en true.
  @Column({ name: 'on_court', type: 'boolean', default: true })
  onCourt: boolean;

  // La pone el servidor, con milisegundos, para que el orden no dependa del reloj del script.
  @Column({ name: 'recorded_at', type: 'datetime', precision: 3 })
  recordedAt: Date;
}
