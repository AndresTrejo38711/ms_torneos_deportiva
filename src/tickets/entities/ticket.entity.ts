import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { FanPaymentMethod } from '../../fan-payment-methods/entities/fan-payment-method.entity';
import { Fan } from '../../fans/entities/fan.entity';
import { Locality } from '../../localities/entities/locality.entity';
import { Match } from '../../matches/entities/match.entity';
import { TicketStatus } from './ticket.enums';

// Boleto del diagrama (HU-GE-04): la entrada de un aficionado a un partido, en una localidad del
// escenario donde se juega. Es la clase de asociación entre Partido y Aficionado, y apunta a su
// Localidad. Una compra de varios boletos son varias filas con la misma referencia de pago.
// Un boleto no se borra: es historial (por eso su partido, su localidad y su método de pago tampoco).
@Entity({ name: 'tickets' })
// El código identifica al boleto en la entrada del escenario.
@Unique('uk_ticket_code', ['code'])
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  // "BOL-7F3K9Q2M".
  @Column({ type: 'varchar', length: 12 })
  code: string;

  @ManyToOne(() => Match, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'match_id', foreignKeyConstraintName: 'fk_ticket_match' })
  match: Match;

  @ManyToOne(() => Locality, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'locality_id',
    foreignKeyConstraintName: 'fk_ticket_locality',
  })
  locality: Locality;

  @ManyToOne(() => Fan, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fan_id', foreignKeyConstraintName: 'fk_ticket_fan' })
  fan: Fan;

  // RESTRICT: un método de pago con boletos no se elimina, solo se desactiva (HU-GC-10, criterio 9).
  @ManyToOne(() => FanPaymentMethod, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'fan_payment_method_id',
    foreignKeyConstraintName: 'fk_ticket_payment_method',
  })
  paymentMethod: FanPaymentMethod;

  // El precio de la localidad en el partido al momento de comprar, en pesos. No cambia.
  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.PENDIENTE })
  status: TicketStatus;

  // La misma para todos los boletos de una compra: con ella se cobra en la pasarela de pago.
  @Index('ix_ticket_payment_reference')
  @Column({ name: 'payment_reference', type: 'varchar', length: 40 })
  paymentReference: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Cuándo se aprobó el pago.
  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  // Cuándo se rechazó el pago o se anuló el boleto.
  @Column({ name: 'closed_at', type: 'datetime', nullable: true })
  closedAt: Date | null;
}
