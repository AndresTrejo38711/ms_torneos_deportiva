import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Subscription } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { ApplicationException } from '../common/errors/application.exception';
import { SecurityClient } from '../security/security.client';
import { TrackingEvent, TrackingEvents } from './tracking-events';

// El socket vive bajo el prefijo del microservicio, así el proxy de Vite (regla /api/deportiva, con
// ws: true) lo manda aquí y no a ms_torneos_security.
const SOCKET_PATH = '/api/deportiva/socket.io';

// La URL de la pizarra por REST, tal como está registrada en el permiso seguimiento · VIEW.
const boardUrl = (matchId: number) =>
  `/api/deportiva/tracking/matches/${matchId}`;

// Prefijo de la sala de cada partido: "match:15".
const ROOM_PREFIX = 'match:';

// Respuesta (ack) a "join".
type JoinReply = { ok: true } | { error: string };

// HU-GC-09 · Pizarra en vivo (criterios 9 y 10). Las escrituras siguen siendo REST; este socket solo
// avisa a las pizarras abiertas:
// 1. El cliente se conecta con su token: io({ path: '/api/deportiva/socket.io', auth: { token } }).
// 2. Emite "join" con { matchId }. Puede unirse quien pueda ver la pizarra por REST
//    (GET /api/deportiva/tracking/matches/{matchId}), y la respuesta es { ok: true } o { error }.
// 3. Desde ahí recibe "positions" (las posiciones recién guardadas) y "status" ({ matchId, status,
//    startedAt, finishedAt }) de ese partido, y de ningún otro.
@WebSocketGateway({ path: SOCKET_PATH })
export class TrackingGateway implements OnGatewayInit, OnModuleDestroy {
  private readonly logger = new Logger(TrackingGateway.name);

  // El mismo interruptor que PermissionsGuard: con SECURITY_ENABLED=false cualquiera se une.
  private readonly securityEnabled: boolean;

  private subscription?: Subscription;

  @WebSocketServer()
  server?: Server;

  constructor(
    private readonly events: TrackingEvents,
    private readonly securityClient: SecurityClient,
    config: ConfigService,
  ) {
    this.securityEnabled =
      config.get<string>('SECURITY_ENABLED', 'true') !== 'false';
  }

  // Lo que publican los services (ya guardado) se reenvía a la sala del partido.
  afterInit(): void {
    this.subscription = this.events.stream.subscribe((event) =>
      this.broadcast(event),
    );
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  @SubscribeMessage('join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<JoinReply> {
    const matchId = readMatchId(body);
    if (matchId === null) {
      return { error: 'Envía el partido así: { "matchId": 15 }' };
    }

    const denied = await this.deniedReason(client, matchId);
    if (denied) {
      return { error: denied };
    }

    // Una pizarra mira un partido a la vez: sale de la sala anterior, si estaba en otra.
    for (const room of client.rooms) {
      if (room.startsWith(ROOM_PREFIX)) {
        await client.leave(room);
      }
    }
    await client.join(roomOf(matchId));
    return { ok: true };
  }

  // ---------------------------------------------------------------------------------------------

  // null si puede ver la pizarra; si no, el motivo. La decisión la toma ms_torneos_security con la
  // misma URL y método que la pizarra por REST: quien puede verla, puede seguirla en vivo.
  private async deniedReason(
    client: Socket,
    matchId: number,
  ): Promise<string | null> {
    if (!this.securityEnabled) {
      return null;
    }
    const token = readToken(client);
    if (!token) {
      return 'Debes iniciar sesión: falta el token de acceso';
    }
    try {
      const user = await this.securityClient.authorize(
        `Bearer ${token}`,
        boardUrl(matchId),
        'GET',
      );
      return user
        ? null
        : 'Ninguno de tus roles tiene permiso para ver esta pizarra';
    } catch (error) {
      // Token vencido (401) o seguridad caída (503): el mensaje de SecurityClient sirve tal cual.
      if (error instanceof ApplicationException) {
        return error.message;
      }
      this.logger.error(
        `No se pudo validar el ingreso a la pizarra ${matchId}: ${String(error)}`,
      );
      return 'No se pudo validar tu ingreso a la pizarra. Intenta de nuevo';
    }
  }

  private broadcast(event: TrackingEvent): void {
    const room = this.server?.to(roomOf(event.matchId));
    if (!room) {
      return;
    }
    if (event.type === 'positions') {
      room.emit('positions', event.positions);
    } else {
      const { status, startedAt, finishedAt } = event.tracking;
      room.emit('status', {
        matchId: event.matchId,
        status,
        startedAt,
        finishedAt,
      });
    }
  }
}

function roomOf(matchId: number): string {
  return `${ROOM_PREFIX}${matchId}`;
}

// El id del partido de { matchId }: un entero positivo, o null.
function readMatchId(body: unknown): number | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { matchId } = body as Record<string, unknown>;
  return typeof matchId === 'number' &&
    Number.isSafeInteger(matchId) &&
    matchId > 0
    ? matchId
    : null;
}

// El token del handshake (auth: { token }), con o sin el "Bearer " delante.
function readToken(client: Socket): string | null {
  const auth = client.handshake.auth as Record<string, unknown> | undefined;
  const raw = auth?.token;
  if (typeof raw !== 'string') {
    return null;
  }
  const token = raw.replace(/^Bearer\s+/i, '').trim();
  return token === '' ? null : token;
}
