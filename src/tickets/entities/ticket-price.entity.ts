import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Locality } from '../../localities/entities/locality.entity';
import { Match } from '../../matches/entities/match.entity';

// HU-GE-04. Precio de una localidad en un partido: lo fija el administrador al habilitar la venta.
// Una localidad sin precio en un partido no se vende en ese partido. El boleto copia el precio al
// comprarse, así que cambiarlo después no toca los boletos ya vendidos.
@Entity({ name: 'ticket_prices' })
// Una localidad tiene un solo precio en cada partido.
@Unique('uk_ticket_price', ['match', 'locality'])
export class TicketPrice {
  @PrimaryGeneratedColumn()
  id: number;

  // CASCADE: si se elimina el partido (solo se puede sin boletos), sus precios se van con él.
  @ManyToOne(() => Match, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'match_id',
    foreignKeyConstraintName: 'fk_ticket_price_match',
  })
  match: Match;

  // RESTRICT: una localidad con precio en algún partido no se elimina (HU-GE-03, criterio 8).
  @ManyToOne(() => Locality, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'locality_id',
    foreignKeyConstraintName: 'fk_ticket_price_locality',
  })
  locality: Locality;

  // Pesos, sin centavos.
  @Column({ type: 'int' })
  price: number;
}
