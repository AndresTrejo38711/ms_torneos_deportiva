import {
  CreateDateColumn,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';

// Pelota del diagrama (HU-GC-09): la que se usa en un partido. Va 1 a 1 con el partido y no tiene
// pantalla propia (está en rojo en el diagrama): se crea al iniciar el seguimiento, con el nombre que
// dé el administrador. Así la pelota de la pizarra es siempre la del partido (criterio 15).
@Entity({ name: 'balls' })
export class Ball {
  @PrimaryGeneratedColumn()
  id: number;

  // Una por partido. CASCADE: si se elimina un partido sin posiciones (programado o cancelado), su
  // pelota se va con él; uno con posiciones no se elimina (son historial).
  @OneToOne(() => Match, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'match_id',
    foreignKeyConstraintName: 'fk_ball_match',
  })
  match: Match;

  @Column({ length: 60 })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
