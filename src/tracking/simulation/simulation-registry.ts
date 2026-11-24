import { Injectable } from '@nestjs/common';
import { SimulationStateDto } from '../dto/simulation.dto';

// HU-GC-09: qué partidos están simulándose ahora y cada cuánto. Solo guarda el dato (en memoria): quien
// simula es TrackingSimulationService. Así TrackingService puede contarlo en la pizarra sin depender de él.
@Injectable()
export class SimulationRegistry {
  private readonly running = new Map<number, number>(); // id del partido → intervalMs

  stateOf(matchId: number): SimulationStateDto {
    const intervalMs = this.running.get(matchId);
    return {
      running: intervalMs !== undefined,
      intervalMs: intervalMs ?? null,
    };
  }

  isRunning(matchId: number): boolean {
    return this.running.has(matchId);
  }

  mark(matchId: number, intervalMs: number): void {
    this.running.set(matchId, intervalMs);
  }

  clear(matchId: number): void {
    this.running.delete(matchId);
  }
}
