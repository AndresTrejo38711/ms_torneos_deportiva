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
