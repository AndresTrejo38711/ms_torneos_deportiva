import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PlayerSkill } from '../../player-skills/entities/player-skill.entity';
import { TeamPlayer } from '../../team-players/entities/team-player.entity';
import { DocumentType } from './document-type.enum';
import { DominantFoot } from './dominant-foot.enum';

// HU-GD-04. Persona que puede integrar los equipos.
@Entity({ name: 'players' })
// El identificador único es el documento: tipo + número. El mismo número puede repetirse con
// otro tipo (una TI y una CC distintas), pero no con el mismo.
@Unique('uk_player_document', ['documentType', 'documentNumber'])
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  // En MySQL queda como ENUM('CC','TI','CE','PA').
  @Column({ name: 'document_type', type: 'enum', enum: DocumentType })
  documentType: DocumentType;

  @Column({ name: 'document_number', length: 20 })
  documentNumber: string;

  @Column({ name: 'first_name', length: 60 })
  firstName: string;

  @Column({ name: 'last_name', length: 60 })
  lastName: string;

  // Columna DATE: TypeORM la entrega como texto "AAAA-MM-DD".
  @Column({ name: 'birth_date', type: 'date' })
  birthDate: string;

  // Opcional: posición en la que juega, como texto corto ("Delantero", "DEL", "Base"...).
  // Es texto libre porque las posiciones cambian de un deporte a otro.
  @Column({ type: 'varchar', length: 30, nullable: true })
  position: string | null;

  // Opcional: país de origen, como texto ("Colombia").
  @Column({ type: 'varchar', length: 60, nullable: true })
  nationality: string | null;

  // Opcional: estatura en centímetros (180 es 1,80 m). Un entero evita los decimales.
  @Column({
    name: 'height_cm',
    type: 'smallint',
    unsigned: true,
    nullable: true,
  })
  heightCm: number | null;

  // Opcional. En MySQL queda como ENUM('DERECHO','IZQUIERDO','AMBIDIESTRO').
  @Column({
    name: 'dominant_foot',
    type: 'enum',
    enum: DominantFoot,
    nullable: true,
  })
  dominantFoot: DominantFoot | null;

  // Opcional: la foto, ya reducida por el front, guardada como texto "data:image/jpeg;base64,...".
  // select: false → no viene en las consultas salvo que se pida con addSelect. Así, las que traen
  // jugadores relacionados (plantillas, conteos de un equipo) no cargan todas las fotos.
  @Column({ type: 'mediumtext', nullable: true, select: false })
  photo: string | null;

  // Desactivar es la alternativa a eliminar cuando el jugador ya tiene información asociada.
  @Column({ default: true })
  active: boolean;

  // HU-GD-05. Sus contratos con equipos (vigentes e historial). La llave foránea player_id
  // está en team_players.
  @OneToMany(() => TeamPlayer, (teamPlayer) => teamPlayer.player)
  teamPlayers: TeamPlayer[];

  // HU-GD-07. Sus habilidades. La llave foránea player_id está en player_skills.
  @OneToMany(() => PlayerSkill, (playerSkill) => playerSkill.player)
  playerSkills: PlayerSkill[];
}
