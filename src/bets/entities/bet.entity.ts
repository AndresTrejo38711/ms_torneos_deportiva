import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DECIMAL_NUMBER } from '../../common/persistence/decimal.transformer';
import { FanPaymentMethod } from '../../fan-payment-methods/entities/fan-payment-method.entity';
import { Fan } from '../../fans/entities/fan.entity';
import { Match } from '../../matches/entities/match.entity';
import { BetSelection, BetStatus } from './bet.enums';

// Apuesta del diagrama (HU-GC-11): la que un aficionado hace sobre un partido, pagada con uno de sus
// métodos de pago. La cuota se copia del partido al apostar y no cambia nunca: la liquidación usa
// esa. Una apuesta no se borra: es historial (por eso su partido y su método de pago tampoco).
@Entity({ name: 'bets' })
export class Bet {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Fan, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fan_id', foreignKeyConstraintName: 'fk_bet_fan' })
  fan: Fan;

  @ManyToOne(() => Match, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'match_id', foreignKeyConstraintName: 'fk_bet_match' })
  match: Match;

  // RESTRICT: un método de pago con apuestas no se elimina, solo se desactiva (HU-GC-10, criterio 9).
  @ManyToOne(() => FanPaymentMethod, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'fan_payment_method_id',
    foreignKeyConstraintName: 'fk_bet_payment_method',
  })
  paymentMethod: FanPaymentMethod;

  @Column({ type: 'enum', enum: BetSelection })
  selection: BetSelection;

  // Pesos, sin centavos.
  @Column({ type: 'int' })
  amount: number;

  // La cuota de la selección en el momento de apostar.
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    transformer: DECIMAL_NUMBER,
  })
  odds: number;

  @Column({ type: 'enum', enum: BetStatus, default: BetStatus.PENDIENTE })
  status: BetStatus;

  // Lo que se paga o se devuelve al cerrarse: valor × cuota (ganada), 0 (perdida) o el valor (anulada
  // o cancelada). null mientras está pendiente.
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: DECIMAL_NUMBER,
  })
  payout: number | null;

  // Cuándo se liquidó, se anuló o se canceló.
  @Column({ name: 'settled_at', type: 'datetime', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
