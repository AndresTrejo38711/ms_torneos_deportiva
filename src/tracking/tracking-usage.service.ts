import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Match } from '../matches/entities/match.entity';
import { PositionRecord } from './entities/position-record.entity';
import { TrackingStatus } from './entities/tracking-status.enum';

// Lo que los partidos necesitan del seguimiento en vivo (HU-GC-09), sin depender de nadie: cuántas
// posiciones tiene un partido (no se elimina uno con posiciones) y finalizar su seguimiento cuando el
// partido termina o se cancela. Si fuera parte de TrackingService habría un ciclo, porque ese depende
// de los partidos (S y D de SOLID), como con TicketUsageService y BetSettlementService.
@Injectable()
export class TrackingUsageService {
  constructor(
    @InjectRepository(PositionRecord)
    private readonly positionRepository: Repository<PositionRecord>,
  ) {}

  countForMatch(matchId: number): Promise<number> {
    return this.positionRepository.count({
      where: { match: { id: matchId } },
    });
  }

  // Al registrar el resultado o cancelar el partido, su seguimiento activo o en pausa queda
  // finalizado, en la misma transacción. Finalizar no borra nada (criterio 16).
  async close(matchId: number, manager: EntityManager): Promise<void> {
    await manager.update(
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
  }
}
