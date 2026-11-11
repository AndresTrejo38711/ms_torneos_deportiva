import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
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

  @Column({ length: 60 })
  city: string;

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
}
