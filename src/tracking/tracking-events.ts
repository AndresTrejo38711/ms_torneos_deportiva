import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import {
  PositionRecordDto,
  TrackingStateDto,
} from './dto/tracking-response.dto';

// Lo que cambió en el seguimiento de un partido (HU-GC-09, criterios 9 y 10):
// - positions: las posiciones que se acaban de guardar (de jugadores y de la pelota);
// - status: el estado nuevo del seguimiento (iniciado, en pausa, finalizado).
export type TrackingEvent =
  | { type: 'positions'; matchId: number; positions: PositionRecordDto[] }
  | { type: 'status'; matchId: number; tracking: TrackingStateDto };

// Avisos del seguimiento en vivo. Los services publican aquí lo que ya quedó guardado y el gateway
// (TrackingGateway) se lo reenvía a las pizarras abiertas. Así ningún service conoce Socket.IO y el
// gateway no conoce las reglas del seguimiento (S y D de SOLID). No depende de nadie, por eso vive en
// TrackingUsageModule: lo usan los partidos (cierre automático) y el seguimiento sin formar un ciclo.
@Injectable()
export class TrackingEvents {
  private readonly subject = new Subject<TrackingEvent>();

  readonly stream: Observable<TrackingEvent> = this.subject.asObservable();

  positions(matchId: number, positions: PositionRecordDto[]): void {
    if (positions.length > 0) {
      this.subject.next({ type: 'positions', matchId, positions });
    }
  }

  status(matchId: number, tracking: TrackingStateDto): void {
    this.subject.next({ type: 'status', matchId, tracking });
  }
}
