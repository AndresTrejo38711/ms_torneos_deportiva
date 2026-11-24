#!/usr/bin/env node
// HU-GC-09 · Simulador del seguimiento en vivo (criterios 7 y 8: "desde un script que simula
// posiciones"). Mueve a los jugadores y la pelota de un partido en juego y envía sus posiciones a
// ms_torneos_deportiva por la misma ruta REST que usaría un sistema real de seguimiento. Las pizarras
// abiertas las reciben por el socket (criterios 9 y 10).
//
// También se puede simular sin consola: botón "Simular partido" en la pizarra (#seguimiento/{id}), que corre
// la misma lógica en el servidor (src/tracking/simulation/).
//
// Node 20 o superior, sin dependencias. Uso (desde ms_torneos_deportiva):
//   node tools/simulador-seguimiento/simular.mjs --partido=15
//   node tools/simulador-seguimiento/simular.mjs --partido=15 --intervalo=500 --pelota="Balón oficial"
//
// Opciones:
//   --partido=ID     el partido (obligatorio). Debe estar En juego.
//   --intervalo=MS   cada cuánto envía un lote de posiciones (por defecto 1000, mínimo 200).
//   --pelota=NOMBRE  nombre de la pelota si el script inicia el seguimiento (si no, "Balón del partido").
//   --pasos=N        se detiene después de N lotes (por defecto sigue hasta que el seguimiento finalice).
//   --sin-login      no inicia sesión (solo con SECURITY_ENABLED=false en deportiva).
//
// Pide el correo y la contraseña de un usuario con el permiso seguimiento · UPDATE (el Administrador
// deportivo) y, si la cuenta tiene 2FA, el código. Variables opcionales: SECURITY_URL (por defecto
// http://localhost:8181) y DEPORTIVA_URL (por defecto http://localhost:8182).
//
// Con el seguimiento en pausa espera a que lo reanuden; cuando finaliza (desde la pizarra, al registrar
// el resultado o al cancelar el partido), termina. Ctrl+C lo detiene sin finalizar el seguimiento.

import { createInterface } from 'node:readline';

const SECURITY_URL = (process.env.SECURITY_URL ?? 'http://localhost:8181').replace(/\/$/, '');
const DEPORTIVA_URL = (process.env.DEPORTIVA_URL ?? 'http://localhost:8182').replace(/\/$/, '');
const API = `${DEPORTIVA_URL}/api/deportiva`;

// ---------------------------------------------------------------------------------------------
// Argumentos

function readArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (!match) {
      fail(`Argumento no reconocido: ${arg}`);
    }
    args[match[1]] = match[2] ?? true;
  }
  const matchId = Number(args.partido);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    fail('Indica el partido: --partido=ID (un número entero)');
  }
  const interval = args.intervalo === undefined ? 1000 : Number(args.intervalo);
  if (!Number.isFinite(interval) || interval < 200) {
    fail('--intervalo va en milisegundos y debe ser de al menos 200');
  }
  const steps = args.pasos === undefined ? Infinity : Number(args.pasos);
  if (!(steps === Infinity || (Number.isInteger(steps) && steps > 0))) {
    fail('--pasos debe ser un entero positivo');
  }
  return {
    matchId,
    interval,
    steps,
    ballName: typeof args.pelota === 'string' ? args.pelota.trim() : undefined,
    login: args['sin-login'] !== true,
  };
}

// ---------------------------------------------------------------------------------------------
// Consola

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
const lines = rl[Symbol.asyncIterator]();

async function ask(question, { hidden = false } = {}) {
  process.stdout.write(question);
  // En una terminal, la contraseña no se muestra mientras se escribe.
  const write = rl._writeToOutput;
  if (hidden && process.stdin.isTTY) {
    rl._writeToOutput = () => {};
  }
  const { value, done } = await lines.next();
  rl._writeToOutput = write;
  if (hidden && process.stdin.isTTY) {
    process.stdout.write('\n');
  }
  if (done) {
    fail('Se cerró la entrada antes de terminar');
  }
  return value.trim();
}

function log(message) {
  const time = new Date().toLocaleTimeString('es-CO', { hour12: false });
  console.log(`[${time}] ${message}`);
}

// Detiene el script: main() lo atrapa, muestra el mensaje y deja el código de salida. No se usa
// process.exit(): en Windows, salir así con conexiones HTTP cerrándose tumba a Node.
class Stop extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function fail(message) {
  throw new Stop(message, 1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------------------------
// HTTP

// { status, body } de una petición; nunca lanza por un 4xx/5xx.
async function http(method, url, { token, body } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    return { status: 0, body: { message: `No responde ${new URL(url).origin}: ${error.message}` } };
  }
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { message: text };
  }
  return { status: response.status, body: parsed };
}

const messageOf = (res) => res.body?.message ?? `HTTP ${res.status}`;

async function login() {
  console.log(`Inicia sesión en ms_torneos_security (${SECURITY_URL}) con un usuario que tenga seguimiento · UPDATE.`);
  const email = await ask('Correo: ');
  const password = await ask('Contraseña: ', { hidden: true });
  const res = await http('POST', `${SECURITY_URL}/api/auth/login`, { body: { email, password } });
  if (res.status !== 200) {
    fail(`No se pudo iniciar sesión: ${messageOf(res)}`);
  }
  if (!res.body.twoFactorRequired) {
    return res.body.accessToken;
  }
  const code = await ask('Código de verificación (6 dígitos): ');
  const verified = await http('POST', `${SECURITY_URL}/api/auth/2fa/verify`, {
    body: { challengeId: res.body.challengeId, code },
  });
  if (verified.status !== 200) {
    fail(`No se pudo verificar el código: ${messageOf(verified)}`);
  }
  return verified.body.accessToken;
}

// Errores que detienen el script sin importar el momento.
function stopOnAuthErrors(res) {
  if (res.status === 401) {
    fail(`La sesión no es válida o expiró: ${messageOf(res)}`);
  }
  if (res.status === 403) {
    fail('Tu usuario no tiene el permiso seguimiento · UPDATE (lo tiene el Administrador deportivo)');
  }
  if (res.status === 0 || res.status >= 500) {
    fail(messageOf(res));
  }
}

// ---------------------------------------------------------------------------------------------
// Cancha y jugadores
//
// x y y van de 0 a 100: porcentaje del largo y del ancho del campo. x = 0 es el arco del local, así que
// el local ocupa x < 50 y el visitante x > 50 (su formación es la del local reflejada).

// Formaciones del local, de atrás hacia adelante (el primero es el portero, si el deporte lo tiene).
const FORMATIONS = {
  // 1-4-4-2
  futbol: [
    [5, 50],
    [18, 15], [16, 38], [16, 62], [18, 85],
    [32, 15], [30, 40], [30, 60], [32, 85],
    [44, 38], [44, 62],
  ],
  // Fútbol de salón / futsal: portero, dos atrás, dos adelante.
  salon: [[6, 50], [20, 30], [20, 70], [38, 35], [38, 65]],
  // Baloncesto: base, escoltas y pívots.
  baloncesto: [[40, 50], [30, 20], [30, 80], [15, 35], [12, 62]],
  // Voleibol: dos filas de tres.
  voleibol: [[38, 20], [38, 50], [38, 80], [18, 20], [18, 50], [18, 80]],
};

function normalize(text) {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// La formación según el deporte (o el de su padre, si es un subdeporte).
function formationFor(sport) {
  const names = `${normalize(sport.name)} ${normalize(sport.parentName)}`;
  // Primero los subdeportes de fútbol: "Fútbol de salón" contiene "futbol".
  if (/salon|futsal|microfutbol/.test(names)) return { kind: 'Fútbol de salón', spots: FORMATIONS.salon };
  if (/balonce|basquet|basket/.test(names)) return { kind: 'Baloncesto', spots: FORMATIONS.baloncesto };
  if (/volei|voley|volley/.test(names)) return { kind: 'Voleibol', spots: FORMATIONS.voleibol };
  if (/futbol|soccer/.test(names)) return { kind: 'Fútbol', spots: FORMATIONS.futbol };
  // Otro deporte: hasta 11, con la formación del fútbol.
  return { kind: sport.name, spots: FORMATIONS.futbol };
}

// Orden de la plantilla: porteros primero, luego defensas, volantes y delanteros, para que el portero
// quede en el arco.
function lineOf(position) {
  const p = normalize(position);
  if (/^(por|arq|gk)/.test(p)) return 0;
  if (/^(def|lat|cen|lib|zag)/.test(p)) return 1;
  if (/^(del|ext|pun|ata|fw)/.test(p)) return 3;
  return 2;
}

// Los jugadores que saltan a la cancha: los activos, hasta llenar la formación.
function lineUp(team, spots, mirrored) {
  const players = team.players
    .filter((player) => player.active)
    .sort((a, b) => lineOf(a.position) - lineOf(b.position))
    .slice(0, spots.length);
  return players.map((player, index) => {
    const [x, y] = spots[index];
    const home = { x: mirrored ? 100 - x : x, y };
    // Arranca donde lo dejó la última posición, o en su sitio de la formación.
    const start = player.lastPosition ?? home;
    return {
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      home,
      x: Number(start.x),
      y: Number(start.y),
    };
  });
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round2 = (value) => Math.round(value * 100) / 100;
const random = (min, max) => min + Math.random() * (max - min);

// Lleva (x, y) hacia el destino sin pasar de `step` unidades.
function stepTowards(from, to, step) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= step) {
    return { x: to.x, y: to.y };
  }
  return { x: from.x + (dx / distance) * step, y: from.y + (dy / distance) * step };
}

// Un paso de la simulación: cada jugador se mueve al azar alrededor de su sitio (el bloque se corre un
// poco hacia donde está la pelota) y la pelota va hacia un jugador al azar; cuando llega, elige otro.
function tick(state) {
  const shift = (state.ball.x - 50) * 0.25;
  for (const player of state.players) {
    const target = {
      x: clamp(player.home.x + shift + random(-6, 6), 1, 99),
      y: clamp(player.home.y + random(-8, 8), 1, 99),
    };
    Object.assign(player, stepTowards(player, target, 2.5));
  }

  if (!state.target || Math.random() < 0.05) {
    state.target = state.players[Math.floor(Math.random() * state.players.length)];
  }
  Object.assign(state.ball, stepTowards(state.ball, state.target, 7));
  if (Math.hypot(state.ball.x - state.target.x, state.ball.y - state.target.y) < 1.5) {
    state.target = state.players[Math.floor(Math.random() * state.players.length)];
  }

  return [
    ...state.players.map((player) => ({ playerId: player.id, x: round2(player.x), y: round2(player.y) })),
    { ball: true, x: round2(clamp(state.ball.x, 0, 100)), y: round2(clamp(state.ball.y, 0, 100)) },
  ];
}

// ---------------------------------------------------------------------------------------------
// Seguimiento

const STATUS_LABEL = {
  SIN_INICIAR: 'sin iniciar',
  ACTIVO: 'activo',
  PAUSADO: 'en pausa',
  FINALIZADO: 'finalizado',
};

async function getBoard(matchId, token) {
  const res = await http('GET', `${API}/tracking/matches/${matchId}`, { token });
  stopOnAuthErrors(res);
  if (res.status === 404) {
    fail(messageOf(res));
  }
  if (res.status !== 200) {
    fail(`No se pudo consultar la pizarra: ${messageOf(res)}`);
  }
  return res.body;
}

// Termina si el partido ya no está en juego o el seguimiento finalizó.
function stopIfOver(board, sent) {
  if (board.tracking.status === 'FINALIZADO' || board.match.status !== 'EN_JUEGO') {
    throw new Stop(`El seguimiento finalizó. Lotes enviados en esta corrida: ${sent}. Las posiciones quedan guardadas.`, 0);
  }
}

async function main() {
  const options = readArgs();
  const token = options.login ? await login() : null;
  rl.close();

  let board = await getBoard(options.matchId, token);
  const label = `${board.match.homeTeam.name} vs ${board.match.awayTeam.name}`;
  if (board.match.status === 'PROGRAMADO') {
    fail(`El partido ${label} todavía no ha empezado: inícialo antes de simular`);
  }
  if (board.match.status !== 'EN_JUEGO') {
    fail(`El partido ${label} ya no está en juego (${board.match.status}): no hay nada que simular`);
  }
  if (board.tracking.status === 'FINALIZADO') {
    fail(`El seguimiento de ${label} ya finalizó: no se vuelve a abrir`);
  }
  if (board.tracking.status === 'SIN_INICIAR') {
    const res = await http('PATCH', `${API}/tracking/matches/${options.matchId}/start`, {
      token,
      body: options.ballName ? { ballName: options.ballName } : {},
    });
    stopOnAuthErrors(res);
    if (res.status !== 200) {
      fail(`No se pudo iniciar el seguimiento: ${messageOf(res)}`);
    }
    board = res.body;
    log(`Seguimiento de ${label} iniciado con "${board.ball.name}".`);
  }

  const { kind, spots } = formationFor(board.sport);
  const players = [...lineUp(board.home, spots, false), ...lineUp(board.away, spots, true)];
  // Los que hoy figuran en cancha sin ser de esta formación (de otra simulación) salen en el primer lote
  // (onCourt: false: van al banco), así en la cancha solo quedan los que juegan.
  const playing = new Set(players.map((player) => player.id));
  let leaving = [...board.home.players, ...board.away.players]
    .filter((player) => player.lastPosition && player.onCourt !== false && !playing.has(player.id))
    .map((player) => ({
      playerId: player.id,
      x: Number(player.lastPosition.x),
      y: Number(player.lastPosition.y),
      onCourt: false,
    }));
  if (players.length === 0) {
    fail(`Ninguno de los dos equipos tiene jugadores activos con contrato el día del partido`);
  }
  const homeCount = players.filter((player) => player.home.x < 50).length;
  log(`${label} · ${kind}: ${homeCount} del local y ${players.length - homeCount} del visitante en cancha, más la pelota.`);
  const ballStart = board.ball?.lastPosition ?? { x: 50, y: 50 };
  const state = { players, ball: { x: Number(ballStart.x), y: Number(ballStart.y) }, target: null };

  let sent = 0;
  let status = board.tracking.status;
  // Ctrl+C: termina el lote en curso y sale (un segundo Ctrl+C sale de una vez).
  let stopping = false;
  process.on('SIGINT', () => {
    if (stopping) {
      process.exit(130);
    }
    stopping = true;
  });
  if (status === 'PAUSADO') {
    log('El seguimiento está en pausa: espero a que lo reanuden.');
  }
  log(`Enviando posiciones cada ${options.interval} ms. Ctrl+C para detener.`);

  while (sent < options.steps && !stopping) {
    const started = Date.now();
    if (status === 'ACTIVO') {
      const positions = [...leaving, ...tick(state)];
      const res = await http('POST', `${API}/tracking/matches/${options.matchId}/positions`, {
        token,
        body: { positions },
      });
      stopOnAuthErrors(res);
      if (res.status === 201) {
        leaving = [];
        sent++;
        if (sent === 1 || sent % 10 === 0) {
          const ball = positions.at(-1);
          log(`Lote ${sent}: ${positions.length} posiciones (pelota en ${ball.x}, ${ball.y}).`);
        }
      } else {
        // En pausa, finalizado o el partido terminó: la pizarra dice cuál.
        board = await getBoard(options.matchId, token);
        stopIfOver(board, sent);
        if (board.tracking.status === 'PAUSADO') {
          log('El seguimiento está en pausa: espero a que lo reanuden.');
        } else {
          log(`Lote rechazado: ${messageOf(res)}`);
        }
        status = board.tracking.status;
      }
    } else {
      board = await getBoard(options.matchId, token);
      stopIfOver(board, sent);
      if (board.tracking.status === 'ACTIVO') {
        log('Seguimiento reanudado.');
      }
      status = board.tracking.status;
    }
    await sleep(Math.max(0, options.interval - (Date.now() - started)));
  }
  if (stopping) {
    log(`Detenido. Lotes enviados: ${sent}. El seguimiento sigue ${STATUS_LABEL[status]}; finalízalo desde la pizarra.`);
  } else {
    log(`Listo: ${sent} lotes enviados. El seguimiento sigue ${STATUS_LABEL[status]}.`);
  }
}

main()
  .catch((error) => {
    if (error instanceof Stop && error.code === 0) {
      log(error.message);
    } else {
      console.error(`✖ ${error instanceof Stop ? error.message : (error.stack ?? String(error))}`);
      process.exitCode = 1;
    }
  })
  .finally(() => rl.close());
