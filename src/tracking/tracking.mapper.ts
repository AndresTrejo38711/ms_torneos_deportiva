import {
  toLocalDateTime,
  toLocalTimestamp,
} from '../common/persistence/local-date-time.transformer';
import { Match } from '../matches/entities/match.entity';
import { PlayerSummaryDto } from '../players/dto/player-response.dto';
import {
  LastPositionDto,
  PositionRecordDto,
  TrackedPlayerDto,
  TrackingStateDto,
} from './dto/tracking-response.dto';
import { PositionRecord } from './entities/position-record.entity';

// Entidades → DTO de respuesta del seguimiento (HU-GC-09).

type TrackingColumns = Pick<
  Match,
  'trackingStatus' | 'trackingStartedAt' | 'trackingFinishedAt'
>;

export function toTrackingState(match: TrackingColumns): TrackingStateDto {
  return {
    status: match.trackingStatus,
    startedAt: match.trackingStartedAt
      ? toLocalDateTime(match.trackingStartedAt)
      : null,
    finishedAt: match.trackingFinishedAt
      ? toLocalDateTime(match.trackingFinishedAt)
      : null,
  };
}

// El registro debe venir con el id de su partido, de su jugador y de su pelota (los que tenga).
export function toPositionRecord(record: PositionRecord): PositionRecordDto {
  return {
    id: record.id,
    matchId: record.match.id,
    playerId: record.player?.id ?? null,
    ball: record.ball !== null && record.ball !== undefined,
    x: record.x,
    y: record.y,
    recordedAt: toLocalTimestamp(record.recordedAt),
    onCourt: record.onCourt,
  };
}

export function toLastPosition(
  record: PositionRecord | undefined,
): LastPositionDto | null {
  return record
    ? {
        x: record.x,
        y: record.y,
        recordedAt: toLocalTimestamp(record.recordedAt),
      }
    : null;
}

export function toTrackedPlayer(
  player: PlayerSummaryDto,
  last: PositionRecord | undefined,
): TrackedPlayerDto {
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    active: player.active,
    lastPosition: toLastPosition(last),
    onCourt: last ? last.onCourt : false,
  };
}
