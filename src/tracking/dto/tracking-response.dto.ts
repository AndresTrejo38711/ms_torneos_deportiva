import { MatchResponseDto } from '../../matches/dto/match-response.dto';
import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { TrackingStatus } from '../entities/tracking-status.enum';

// El estado del seguimiento de un partido. Las fechas van en hora local, "AAAA-MM-DDTHH:mm".
export class TrackingStateDto {
  status: TrackingStatus;
  startedAt: string | null;
  finishedAt: string | null;
}

// Dónde está ahora un jugador o la pelota: su último registro. recordedAt lleva segundos y
// milisegundos ("AAAA-MM-DDTHH:mm:ss.SSS").
export class LastPositionDto {
  x: number;
  y: number;
  recordedAt: string;
}

// Un jugador en la pizarra. Sin documento: el hincha también la ve. position es la posición de juego
// del jugador (portero, defensa...), si la tiene registrada.
export class TrackedPlayerDto {
  id: number;
  firstName: string;
  lastName: string;
  position: string | null;
  active: boolean;
  // null mientras no se le haya registrado ninguna posición.
  lastPosition: LastPositionDto | null;
}

// Un equipo del partido con su plantilla del día del partido (criterios 3 y 14).
export class TrackedTeamDto {
  team: TeamSummaryDto;
  players: TrackedPlayerDto[];
}

// La pelota del partido (criterio 15).
export class TrackedBallDto {
  id: number;
  name: string;
  lastPosition: LastPositionDto | null;
}

// Un registro de posición: de un jugador (playerId) o de la pelota (ball = true) (criterio 12).
export class PositionRecordDto {
  id: number;
  matchId: number;
  playerId: number | null;
  ball: boolean;
  x: number;
  y: number;
  recordedAt: string;
}

// El deporte del torneo, para dibujar su campo (criterio 2). parentName sirve con los subdeportes:
// uno sin campo propio se dibuja como el de su padre.
export class TrackingSportDto {
  id: number;
  name: string;
  parentName: string | null;
}

export class TrackingTotalsDto {
  // Cuántas posiciones se han registrado en el partido.
  records: number;
  // Cuántos jugadores tienen al menos una.
  playersTracked: number;
}

// GET /tracking/matches/{matchId}: lo que muestra la pizarra.
export class TrackingBoardDto {
  match: MatchResponseDto;
  sport: TrackingSportDto;
  tracking: TrackingStateDto;
  // null hasta que se inicia el seguimiento (ahí se crea la pelota).
  ball: TrackedBallDto | null;
  home: TrackedTeamDto;
  away: TrackedTeamDto;
  totals: TrackingTotalsDto;
  // Las últimas posiciones registradas, de la más nueva a la más vieja.
  latest: PositionRecordDto[];
}

// GET /tracking/matches: un partido en juego o con seguimiento.
export class TrackedMatchDto {
  match: MatchResponseDto;
  tracking: TrackingStateDto;
}
