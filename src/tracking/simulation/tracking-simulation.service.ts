import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Subscription } from 'rxjs';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCase } from '../../common/errors/error-case.enum';
import { MatchStatus } from '../../matches/entities/match-status.enum';
import { matchLabel } from '../../matches/match-label';
import {
  DEFAULT_SIMULATION_INTERVAL,
  StartSimulationDto,
} from '../dto/simulation.dto';
import { TrackingBoardDto } from '../dto/tracking-response.dto';
import { TrackingStatus } from '../entities/tracking-status.enum';
import { TrackingEvents } from '../tracking-events';
import { TrackingService } from '../tracking.service';
import { createSimulation, nextPositions, Simulation } from './simulation-plan';
import { SimulationRegistry } from './simulation-registry';

interface Run {
  simulation: Simulation;
  timer: NodeJS.Timeout;
  busy: boolean; // hay un lote registrándose: el siguiente tic espera
  paused: boolean; // el seguimiento está en pausa: no se envía nada
}

const STATUS_TEXT: Record<TrackingStatus, string> = {
  [TrackingStatus.SIN_INICIAR]: 'sin iniciar: inícialo antes de simular',
  [TrackingStatus.ACTIVO]: 'activo',
  [TrackingStatus.PAUSADO]: 'en pausa: reanúdalo antes de simular',
  [TrackingStatus.FINALIZADO]: 'finalizado: ya no recibe posiciones',
};

// HU-GC-09 · "Simular partido" desde la pizarra (criterios 7 y 8: las posiciones las registra un script que
// las simula; aquí el script corre en el servidor). Un temporizador por partido: en cada tic mueve a los
// jugadores y la pelota y los registra con TrackingService.registerPositions, así que valen las mismas reglas
// que en la API. Con el seguimiento en pausa espera; al finalizar el seguimiento (o registrar el resultado,
// o cancelar el partido) se detiene sola. Vive en memoria: si el servidor se reinicia, se pierde.
@Injectable()
export class TrackingSimulationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TrackingSimulationService.name);

  private readonly runs = new Map<number, Run>();

  private subscription?: Subscription;

  constructor(
    private readonly trackingService: TrackingService,
    private readonly registry: SimulationRegistry,
    private readonly events: TrackingEvents,
  ) {}

  // Se entera de las pausas, las reanudaciones y el final del seguimiento.
  onModuleInit(): void {
    this.subscription = this.events.stream.subscribe((event) => {
      if (event.type !== 'status') return;
      const run = this.runs.get(event.matchId);
      if (!run) return;
      if (event.tracking.status === TrackingStatus.FINALIZADO) {
        this.end(event.matchId);
      } else {
        run.paused = event.tracking.status === TrackingStatus.PAUSADO;
      }
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
    for (const matchId of this.runs.keys()) this.end(matchId, false);
  }

  async start(
    matchId: number,
    dto: StartSimulationDto,
  ): Promise<TrackingBoardDto> {
    const board = await this.trackingService.board(matchId); // 404 si el partido no existe
    const label = matchLabel(board.match);
    if (this.runs.has(matchId)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La simulación de ${label} ya está en curso`,
      );
    }
    if (board.match.status !== MatchStatus.EN_JUEGO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido ${label} no está en juego: solo se simula un partido en juego`,
      );
    }
    if (board.tracking.status !== TrackingStatus.ACTIVO) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El seguimiento de ${label} está ${STATUS_TEXT[board.tracking.status]}`,
      );
    }
    const simulation = createSimulation(board);
    if (simulation.players.length === 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Ninguno de los dos equipos de ${label} tiene jugadores activos con contrato el día del partido`,
      );
    }

    const intervalMs = dto.intervalMs ?? DEFAULT_SIMULATION_INTERVAL;
    const timer = setInterval(() => void this.tick(matchId), intervalMs);
    this.runs.set(matchId, { simulation, timer, busy: false, paused: false });
    this.registry.mark(matchId, intervalMs);
    this.announce(matchId);
    return this.trackingService.board(matchId);
  }

  async stop(matchId: number): Promise<TrackingBoardDto> {
    const board = await this.trackingService.board(matchId); // 404 si el partido no existe
    if (!this.runs.has(matchId)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No hay una simulación en curso en ${matchLabel(board.match)}`,
      );
    }
    this.end(matchId);
    return this.trackingService.board(matchId);
  }

  // Un movimiento: registra el lote. Si lo rechazan porque el seguimiento quedó en pausa justo ahora, espera;
  // por cualquier otro motivo, la simulación se detiene.
  private async tick(matchId: number): Promise<void> {
    const run = this.runs.get(matchId);
    if (!run || run.busy || run.paused) return;
    run.busy = true;
    try {
      await this.trackingService.registerPositions(matchId, {
        positions: nextPositions(run.simulation),
      });
    } catch (error) {
      const status = await this.trackingService
        .statusOf(matchId)
        .catch(() => null);
      if (status === TrackingStatus.PAUSADO) {
        run.paused = true;
      } else {
        this.logger.warn(
          `Simulación del partido ${matchId} detenida: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.end(matchId);
      }
    } finally {
      run.busy = false;
    }
  }

  private end(matchId: number, announce = true): void {
    const run = this.runs.get(matchId);
    if (!run) return;
    clearInterval(run.timer);
    this.runs.delete(matchId);
    this.registry.clear(matchId);
    if (announce) this.announce(matchId);
  }

  private announce(matchId: number): void {
    this.events.simulation(matchId, this.registry.stateOf(matchId));
  }
}
