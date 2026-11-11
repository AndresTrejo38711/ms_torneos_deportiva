import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Player } from '../../players/entities/player.entity';
import { Team } from '../../teams/entities/team.entity';

// HU-GD-05. Contrato de un jugador con un equipo: la tabla intermedia de la relación N:N entre
// equipos y jugadores, pero con datos propios (las fechas).
//
// A diferencia de team_sports, aquí NO hay unique (equipo, jugador): un jugador puede volver a
// un equipo en el que ya estuvo, y cada paso queda como una fila más (historial de traspasos).
// Lo que no se permite es que dos contratos del mismo par se crucen en fechas (lo revisa el service).
@Entity({ name: 'team_players' })
export class TeamPlayer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Team, (team) => team.teamPlayers, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'fk_team_player_team',
  })
  team: Team;

  @ManyToOne(() => Player, (player) => player.teamPlayers, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'player_id',
    foreignKeyConstraintName: 'fk_team_player_player',
  })
  player: Player;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  // Retirar al jugador no borra la fila: llena esta fecha y el contrato queda cerrado.
  @Column({ name: 'retired_at', type: 'date', nullable: true })
  retiredAt: string | null;
}
