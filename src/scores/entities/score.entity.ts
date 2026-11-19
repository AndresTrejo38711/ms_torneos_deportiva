import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { Player } from '../../players/entities/player.entity';
import { Team } from '../../teams/entities/team.entity';

// HU-GC-07. Una anotación: lo que un jugador le sumó al marcador de su equipo en un partido (un gol,
// una canasta, un punto). Solo lo que suma: faltas o tarjetas no son anotaciones, y los penales de
// una tanda tampoco, porque no suman al marcador.
//
// El diagrama la une a Partido y a Jugador. También se guarda el equipo: un jugador puede tener
// contrato con dos equipos a la vez, y si después se edita su contrato, la anotación no debe
// cambiar de equipo.
@Entity({ name: 'scores' })
export class Score {
  @PrimaryGeneratedColumn()
  id: number;

  // RESTRICT: un partido con anotaciones no se elimina; primero se eliminan ellas.
  @ManyToOne(() => Match, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'match_id', foreignKeyConstraintName: 'fk_score_match' })
  match: Match;

  // El local o el visitante del partido.
  @ManyToOne(() => Team, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team_id', foreignKeyConstraintName: 'fk_score_team' })
  team: Team;

  // Eliminar la anotación no elimina al jugador (y un jugador con anotaciones no se elimina).
  @ManyToOne(() => Player, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'player_id',
    foreignKeyConstraintName: 'fk_score_player',
  })
  player: Player;

  @Column({ type: 'int' })
  minute: number;

  // Cuánto suma al marcador: 1 en fútbol; 1, 2 o 3 en baloncesto.
  @Column({ type: 'int', default: 1 })
  points: number;
}
