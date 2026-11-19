import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

// Aficionado del diagrama (HU-GC-10 y HU-GC-11). Es un usuario de ms_torneos_security con el rol
// Aficionado: aquí solo se guarda su id de allá y su correo, para escribirle aunque no sea él quien
// hace la petición (por ejemplo, cuando se liquida su apuesta). La fila se crea sola la primera vez
// que hace algo, y el correo se actualiza en cada petición suya.
//
// En el Anexo 4 aquí se cuelgan también sus boletos y sus equipos favoritos.
@Entity({ name: 'fans' })
@Unique('uk_fan_user', ['userId'])
export class Fan {
  @PrimaryGeneratedColumn()
  id: number;

  // Id del usuario en ms_torneos_security.
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
