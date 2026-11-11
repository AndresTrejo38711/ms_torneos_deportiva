import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TeamPlayer } from '../../team-players/entities/team-player.entity';
import { TeamSport } from '../../team-sports/entities/team-sport.entity';

// HU-GD-02. Organización que puede participar en las competencias. Sus deportes (HU-GD-03) y
// sus jugadores (HU-GD-05) se relacionan con tablas intermedias.
@Entity({ name: 'teams' })
// Igual que en los deportes, la base no distingue mayúsculas ni tildes:
// "Atlético Nacional" y "ATLETICO NACIONAL" cuentan como el mismo nombre.
@Unique('uk_team_name', ['name'])
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60 })
  name: string;

  // Opcional: cómo se le dice al equipo en corto ("AT. Manizales"), para las tablas.
  @Column({ name: 'short_name', type: 'varchar', length: 30, nullable: true })
  shortName: string | null;

  @Column({ length: 60 })
  city: string;

  // Opcional: a qué se dedica el equipo, para mostrarlo en su detalle.
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // Columna DATE: TypeORM la entrega como texto "AAAA-MM-DD", sin hora ni zona horaria.
  @Column({ name: 'foundation_date', type: 'date', nullable: true })
  foundationDate: string | null;

  // Desactivar es la alternativa a eliminar cuando el equipo ya tiene información asociada.
  @Column({ default: true })
  active: boolean;

  // HU-GD-03. Deportes en los que participa, a través de la tabla intermedia team_sports.
  // No crea columnas aquí: la llave foránea team_id está en team_sports.
  @OneToMany(() => TeamSport, (teamSport) => teamSport.team)
  teamSports: TeamSport[];

  // HU-GD-05. Contratos de sus jugadores (vigentes e historial). La llave foránea team_id
  // está en team_players.
  @OneToMany(() => TeamPlayer, (teamPlayer) => teamPlayer.team)
  teamPlayers: TeamPlayer[];
}
