import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { PaymentMethodKind } from './payment-method-kind.enum';

// MétodoPago del diagrama (HU-GC-10): el catálogo de formas de pago que la plataforma acepta. Rojo en
// el diagrama: no tiene pantalla, lo siembra el microservicio al arrancar y solo se consulta.
@Entity({ name: 'payment_methods' })
@Unique('uk_payment_method_code', ['code'])
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  // Identificador estable para el seeder: "TARJETA_CREDITO", "PSE", "NEQUI"...
  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  // Qué datos pide un método de este tipo.
  @Column({ type: 'enum', enum: PaymentMethodKind })
  kind: PaymentMethodKind;
}
