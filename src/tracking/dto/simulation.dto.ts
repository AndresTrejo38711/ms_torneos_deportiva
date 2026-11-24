import { IsIn, IsOptional } from 'class-validator';

// Cada cuánto el servidor mueve a los jugadores en la simulación (HU-GC-09), en milisegundos.
export const SIMULATION_INTERVALS = [500, 1000, 2000];
export const DEFAULT_SIMULATION_INTERVAL = 1000;

// Cuerpo (opcional) de PATCH /tracking/matches/{matchId}/simulation/start. Ejemplos: {} o { "intervalMs": 500 }.
export class StartSimulationDto {
  @IsOptional()
  @IsIn(SIMULATION_INTERVALS, {
    message: 'intervalMs debe ser 500, 1000 o 2000 (milisegundos)',
  })
  intervalMs?: number;
}

// Si el servidor está simulando el partido y cada cuánto mueve a los jugadores.
export class SimulationStateDto {
  running: boolean;
  intervalMs: number | null; // null si no está corriendo
}
