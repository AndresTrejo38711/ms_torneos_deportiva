import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Match } from '../matches/entities/match.entity';
import { PositionRecord } from './entities/position-record.entity';
import { TrackingStatus } from './entities/tracking-status.enum';
import { TrackingEvents } from './tracking-events';
import { toTrackingState } from './tracking.mapper';

// Lo que los partidos necesitan del seguimiento en vivo (HU-GC-09), sin depender de nadie: cuántas
// posiciones tiene un partido (no se elimina uno con posiciones) y finalizar su seguimiento cuando el
// partido termina o se cancela. Si fuera parte de TrackingService habría un ciclo, porque ese depende
// de los partidos (S y D de SOLID), como con TicketUsageService y BetSettlementService.
@Injectable()
export class TrackingUsageService {
  constructor(
    @InjectRepository(PositionRecord)
    private readonly positionRepository: Repository<PositionRecord>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly events: TrackingEvents,
  ) {}

  countForMatch(matchId: number): Promise<number> {
    return this.positionRepository.count({
      where: { match: { id: matchId } },
    });
  }

  // Al registrar el resultado o cancelar el partido, su seguimiento activo o en pausa queda
  // finalizado, en la misma transacción. Finalizar no borra nada (criterio 16). Devuelve true si
  // finalizó un seguimiento: quien llama avisa con announce() cuando la transacción ya se confirmó
  // (si se avisara aquí y la transacción fallara, las pizarras verían un cierre que no ocurrió).
  async close(matchId: number, manager: EntityManager): Promise<boolean> {
    const result = await manager.update(
      Match,
      {
        id: matchId,
        trackingStatus: In([TrackingStatus.ACTIVO, TrackingStatus.PAUSADO]),
      },
      {
        trackingStatus: TrackingStatus.FINALIZADO,
        trackingFinishedAt: new Date(),
      },
    );
    return (result.affected ?? 0) > 0;
  }

  // Avisa a las pizarras abiertas el estado actual del seguimiento del partido (criterios 9 y 10).
  async announce(matchId: number): Promise<void> {
    const match = await this.matchRepository.findOne({
      select: {
        id: true,
        trackingStatus: true,
        trackingStartedAt: true,
        trackingFinishedAt: true,
      },
      where: { id: matchId },
    });
    if (match) {
      this.events.status(matchId, toTrackingState(match));
    }
  }
}
