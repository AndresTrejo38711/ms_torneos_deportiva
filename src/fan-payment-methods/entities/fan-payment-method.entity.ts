import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fan } from '../../fans/entities/fan.entity';
import { PaymentMethod } from '../../payment-methods/entities/payment-method.entity';
import { AccountType, CardBrand } from './payment-data.enums';

// MétodoPagoAficionado del diagrama (HU-GC-10): un método de pago que un aficionado registró, del tipo
// que elige en el catálogo. Solo guarda datos seguros: nunca el número completo de una tarjeta o
// cuenta ni el CVV (para cobrar con ePayco, en el Anexo 4 se suma el token que entrega ePayco).
//
// Cada tipo usa sus columnas y deja las demás en null: tarjeta (titular, franquicia, últimos 4 y
// vencimiento), cuenta bancaria (banco, tipo de cuenta y últimos 4) o billetera (celular).
@Entity({ name: 'fan_payment_methods' })
export class FanPaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  // RESTRICT: no se borra un aficionado con métodos de pago.
  @ManyToOne(() => Fan, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'fan_id',
    foreignKeyConstraintName: 'fk_fan_payment_fan',
  })
  fan: Fan;

  @ManyToOne(() => PaymentMethod, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'payment_method_id',
    foreignKeyConstraintName: 'fk_fan_payment_method',
  })
  paymentMethod: PaymentMethod;

  // Opcional, para reconocerlo: "Mi Visa".
  @Column({ type: 'varchar', length: 40, nullable: true })
  alias: string | null;

  @Column({ name: 'holder_name', type: 'varchar', length: 100, nullable: true })
  holderName: string | null;

  @Column({ type: 'enum', enum: CardBrand, nullable: true })
  brand: CardBrand | null;

  // Tarjeta o cuenta: solo los últimos 4 dígitos.
  @Column({ name: 'last_four', type: 'char', length: 4, nullable: true })
  lastFour: string | null;

  @Column({ name: 'expiry_month', type: 'int', nullable: true })
  expiryMonth: number | null;

  @Column({ name: 'expiry_year', type: 'int', nullable: true })
  expiryYear: number | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 60, nullable: true })
  bankName: string | null;

  @Column({
    name: 'account_type',
    type: 'enum',
    enum: AccountType,
    nullable: true,
  })
  accountType: AccountType | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  phone: string | null;

  // Desactivado no se puede usar para pagar ni se edita, pero se conserva con sus operaciones.
  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
