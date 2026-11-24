import { PositionInputDto } from '../dto/register-positions.dto';
import {
  TrackedPlayerDto,
  TrackedTeamDto,
  TrackingBoardDto,
  TrackingSportDto,
} from '../dto/tracking-response.dto';

// HU-GC-09 · Simulación del partido desde la web: quién juega, dónde se para cada uno y cómo se mueven los
// jugadores y la pelota. Funciones puras (sin Nest ni base de datos), portadas de
// tools/simulador-seguimiento/simular.mjs. x y y van de 0 a 100; x = 0 es el arco (o el fondo) del local,
// que juega en x < 50. Solo los titulares están en cancha: los demás se registran con onCourt: false (van al
// banco), y en voleibol el líbero entra y sale constantemente por el central de la zaga.

type Side = 'home' | 'away';

interface Point {
  x: number;
  y: number;
}

// Un puesto de la formación, en la mitad del local (el visitante lo usa reflejado: 100 - x). roles: cómo
// empieza la posición de juego que prefiere ese puesto, sin tildes ("por" de portero, "cen" de central...).
interface Spot extends Point {
  roles: string[];
}

export interface FieldPlan {
  label: string;
  spots: Spot[];
  ownHalf: boolean; // voleibol: cada equipo se queda en su lado de la red
  followBall: number; // cuánto se corre el bloque hacia donde está la pelota (0: nada)
  // Un puesto que se turnan dos jugadores (voleibol: el líbero y un central en la zaga central). roles: la
  // posición del suplente.
  swap?: { spot: number; roles: string[] };
}

interface SimPlayer extends Point {
  id: number;
  side: Side;
  spot: number; // índice de su puesto en plan.spots
  home: Point; // su sitio en la formación
}

// El cambio del líbero de un equipo: quién espera en el banco para ese puesto y en cuántos movimientos entra.
interface Swap {
  side: Side;
  spot: number;
  reserve: SimPlayer;
  countdown: number;
}

// Un jugador que sale de la cancha en el próximo lote, con el lugar donde queda registrado.
interface Leaving extends Point {
  id: number;
}

// El estado de una simulación en curso (lo guarda TrackingSimulationService, uno por partido).
export interface Simulation {
  plan: FieldPlan;
  players: SimPlayer[]; // los que están en cancha
  ball: Point;
  target: SimPlayer | null; // hacia quién va la pelota
  benchNow: Leaving[]; // salen en el próximo lote (los que estaban en cancha sin ser titulares)
  swaps: Swap[];
}

const spot = (x: number, y: number, ...roles: string[]): Spot => ({
  x,
  y,
  roles,
});

const GOALKEEPER = ['por', 'arq'];
const DEFENDER = ['def', 'lat', 'zag', 'lib'];
const MIDFIELDER = ['vol', 'med', 'mc'];
const FORWARD = ['del', 'ext', 'ata', 'pun'];

// Fútbol en 1-4-4-2.
const SOCCER: Spot[] = [
  spot(5, 50, ...GOALKEEPER),
  spot(18, 15, ...DEFENDER),
  spot(16, 38, ...DEFENDER),
  spot(16, 62, ...DEFENDER),
  spot(18, 85, ...DEFENDER),
  spot(32, 15, ...MIDFIELDER),
  spot(30, 40, ...MIDFIELDER),
  spot(30, 60, ...MIDFIELDER),
  spot(32, 85, ...MIDFIELDER),
  spot(44, 38, ...FORWARD),
  spot(44, 62, ...FORWARD),
];

const PLANS: Record<
  'futbol' | 'salon' | 'baloncesto' | 'voleibol' | 'otro',
  FieldPlan
> = {
  futbol: { label: 'Fútbol', spots: SOCCER, ownHalf: false, followBall: 0.25 },
  salon: {
    label: 'Fútbol de salón',
    ownHalf: false,
    followBall: 0.25,
    spots: [
      spot(6, 50, 'por', 'arq'),
      spot(20, 30, 'cie', 'def'),
      spot(20, 70, 'ala'),
      spot(38, 35, 'ala'),
      spot(38, 65, 'piv', 'del'),
    ],
  },
  baloncesto: {
    label: 'Baloncesto',
    ownHalf: false,
    followBall: 0.3,
    spots: [
      spot(40, 50, 'bas', 'arm'),
      spot(30, 20, 'esc'),
      spot(30, 80, 'ale'),
      spot(15, 35, 'ala'),
      spot(12, 62, 'piv'),
    ],
  },
  // Voleibol: adelante punta, central y opuesto; atrás punta, líbero y armador. El líbero solo juega atrás:
  // entra y sale por un central (el puesto 4, la zaga central), como en el voleibol de verdad.
  voleibol: {
    label: 'Voleibol',
    ownHalf: true,
    followBall: 0,
    spots: [
      spot(38, 20, 'pun', 'rec'),
      spot(38, 50, 'cen'),
      spot(38, 80, 'opu'),
      spot(18, 20, 'pun', 'rec'),
      spot(18, 50, 'lib', 'cen'),
      spot(18, 80, 'arm', 'col'),
    ],
    swap: { spot: 4, roles: ['cen'] },
  },
  // Otro deporte: hasta 11, con la formación del fútbol.
  otro: {
    label: 'Otro deporte',
    spots: SOCCER,
    ownHalf: false,
    followBall: 0.25,
  },
};

// Cuánto avanza un jugador en cada movimiento: cerca de su sitio camina; lejos (al entrar desde la banda), corre.
const WALK_STEP = 2.5;
const RUN_STEP = 6;

// Un titular arranca en su última posición solo si está a esta distancia de su sitio o menos.
const START_RADIUS = 15;

// Cada cuántos movimientos el líbero entra o sale (al azar entre estos dos).
const SWAP_MIN = 8;
const SWAP_MAX = 14;

function normal(text: string | null | undefined): string {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

// La formación según el deporte (o el de su padre, si es un subdeporte). Las variantes del fútbol van
// primero: "Fútbol de salón" también contiene "futbol".
export function planFor(sport: TrackingSportDto): FieldPlan {
  const names = `${normal(sport.name)} ${normal(sport.parentName)}`;
  if (/salon|futsal|microfutbol/.test(names)) return PLANS.salon;
  if (/balonce|basquet|basket/.test(names)) return PLANS.baloncesto;
  if (/volei|voley|volley/.test(names)) return PLANS.voleibol;
  if (/futbol|soccer/.test(names)) return PLANS.futbol;
  return PLANS.otro;
}

// El primero de la lista que juega en el puesto, prefiriendo los roles en el orden en que se nombran: en un
// club de varios deportes, el delantero de fútbol ("del") gana sobre una "Punta" de voleibol ("pun").
function bestFit(players: TrackedPlayerDto[], roles: string[]): number {
  for (const role of roles) {
    const index = players.findIndex((player) => fits(player.position, [role]));
    if (index >= 0) return index;
  }
  return -1;
}

function fits(position: string | null, roles: string[]): boolean {
  const text = normal(position);
  return text !== '' && roles.some((role) => text.startsWith(role));
}

function toSim(
  player: TrackedPlayerDto,
  plan: FieldPlan,
  side: Side,
  index: number,
): SimPlayer {
  const place = plan.spots[index];
  const home = { x: side === 'home' ? place.x : 100 - place.x, y: place.y };
  // Arranca donde lo dejó su última posición si seguía en cancha y cerca de su sitio; si no (estaba en el
  // banco o en otro lugar de la cancha, por ejemplo de otra formación), arranca en su sitio: así nadie cruza
  // la cancha caminando ni un líbero empieza adelante.
  const last = player.lastPosition;
  const near =
    player.onCourt &&
    last !== null &&
    Math.hypot(Number(last.x) - home.x, Number(last.y) - home.y) <=
      START_RADIUS;
  const start = near && last ? last : home;
  return {
    id: player.id,
    side,
    spot: index,
    home,
    x: Number(start.x),
    y: Number(start.y),
  };
}

// Los que saltan a la cancha: cada puesto toma primero a alguien de su posición; los puestos que queden
// vacíos se llenan con cualquiera de los que sobren. Solo jugadores activos. Si el deporte tiene un puesto
// compartido (el líbero), también elige al suplente de ese puesto.
function lineUp(
  team: TrackedTeamDto,
  plan: FieldPlan,
  side: Side,
): { players: SimPlayer[]; reserve: SimPlayer | null } {
  const free: TrackedPlayerDto[] = team.players.filter(
    (player) => player.active,
  );
  const chosen: (TrackedPlayerDto | undefined)[] = [];
  for (const place of plan.spots) {
    const index = bestFit(free, place.roles);
    chosen.push(index >= 0 ? free.splice(index, 1)[0] : undefined);
  }
  for (let i = 0; i < chosen.length; i++) {
    if (!chosen[i] && free.length > 0) chosen[i] = free.shift();
  }
  const players: SimPlayer[] = [];
  chosen.forEach((player, i) => {
    if (player) players.push(toSim(player, plan, side, i));
  });

  let reserve: SimPlayer | null = null;
  if (plan.swap && chosen[plan.swap.spot]) {
    const { roles, spot: shared } = plan.swap;
    const index = bestFit(free, roles);
    const substitute = index >= 0 ? free[index] : free[0];
    if (substitute) reserve = toSim(substitute, plan, side, shared);
  }
  return { players, reserve };
}

function countdown(): number {
  return SWAP_MIN + Math.floor(Math.random() * (SWAP_MAX - SWAP_MIN + 1));
}

// Arma la simulación de un partido a partir de su pizarra. Los que hoy figuran en cancha sin ser titulares
// (por ejemplo, de una simulación anterior con otra formación) salen en el primer lote.
export function createSimulation(board: TrackingBoardDto): Simulation {
  const plan = planFor(board.sport);
  const home = lineUp(board.home, plan, 'home');
  const away = lineUp(board.away, plan, 'away');
  const players = [...home.players, ...away.players];
  const playing = new Set(players.map((player) => player.id));

  const benchNow: Leaving[] = [];
  for (const player of [...board.home.players, ...board.away.players]) {
    if (player.onCourt && player.lastPosition && !playing.has(player.id)) {
      benchNow.push({
        id: player.id,
        x: Number(player.lastPosition.x),
        y: Number(player.lastPosition.y),
      });
    }
  }

  const swaps: Swap[] = [];
  for (const [side, team] of [
    ['home', home],
    ['away', away],
  ] as const) {
    if (plan.swap && team.reserve) {
      swaps.push({
        side,
        spot: plan.swap.spot,
        reserve: team.reserve,
        countdown: countdown(),
      });
    }
  }

  const last = board.ball?.lastPosition;
  return {
    plan,
    players,
    ball: last ? { x: Number(last.x), y: Number(last.y) } : { x: 50, y: 50 },
    target: null,
    benchNow,
    swaps,
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const round2 = (value: number) => Math.round(value * 100) / 100;
const between = (min: number, max: number) => min + Math.random() * (max - min);

// Lleva un punto hacia el destino sin pasar de `step` unidades.
function stepTowards(from: Point, to: Point, step: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= step) return { x: to.x, y: to.y };
  return {
    x: from.x + (dx / distance) * step,
    y: from.y + (dy / distance) * step,
  };
}

function pickTarget(simulation: Simulation): SimPlayer | null {
  const { players } = simulation;
  return players.length > 0
    ? players[Math.floor(Math.random() * players.length)]
    : null;
}

// Cambios del líbero: cuando le toca, el que ocupa el puesto compartido sale por la banda (onCourt: false) y
// el suplente entra desde la banda y camina hacia su sitio. Devuelve los registros de los que salen.
function substitutions(simulation: Simulation): PositionInputDto[] {
  const leaving: PositionInputDto[] = [];
  for (const swap of simulation.swaps) {
    swap.countdown--;
    if (swap.countdown > 0) continue;
    swap.countdown = countdown();
    const index = simulation.players.findIndex(
      (player) => player.side === swap.side && player.spot === swap.spot,
    );
    if (index < 0) continue;
    const out = simulation.players[index];
    const entering = swap.reserve;
    entering.x = entering.home.x;
    entering.y = 98; // entra desde la banda
    simulation.players[index] = entering;
    swap.reserve = out;
    if (simulation.target === out) simulation.target = null;
    leaving.push({
      playerId: out.id,
      x: round2(clamp(out.x, 0, 100)),
      y: 100,
      onCourt: false,
    });
  }
  return leaving;
}

// Un paso de la simulación: primero salen los que deben ir al banco y se hacen los cambios del líbero; luego
// cada jugador en cancha se mueve al azar alrededor de su sitio (el bloque se corre un poco hacia la pelota,
// salvo en voleibol) y la pelota va hacia un jugador al azar; cuando llega, elige otro. Cambia `simulation`
// y devuelve el lote para registrar.
export function nextPositions(simulation: Simulation): PositionInputDto[] {
  const batch: PositionInputDto[] = simulation.benchNow.map((player) => ({
    playerId: player.id,
    x: round2(clamp(player.x, 0, 100)),
    y: round2(clamp(player.y, 0, 100)),
    onCourt: false,
  }));
  simulation.benchNow = [];
  batch.push(...substitutions(simulation));

  const { plan } = simulation;
  const shift = (simulation.ball.x - 50) * plan.followBall;
  for (const player of simulation.players) {
    let x = clamp(player.home.x + shift + between(-6, 6), 1, 99);
    if (plan.ownHalf) {
      x = player.side === 'home' ? Math.min(x, 47) : Math.max(x, 53);
    }
    const target = { x, y: clamp(player.home.y + between(-8, 8), 1, 99) };
    // Lejos de su sitio (el que acaba de entrar desde la banda) corre; cerca, se mueve con calma.
    const far =
      Math.hypot(player.x - player.home.x, player.y - player.home.y) > 10;
    Object.assign(
      player,
      stepTowards(player, target, far ? RUN_STEP : WALK_STEP),
    );
  }

  if (!simulation.target || Math.random() < 0.05) {
    simulation.target = pickTarget(simulation);
  }
  if (simulation.target) {
    Object.assign(
      simulation.ball,
      stepTowards(simulation.ball, simulation.target, 7),
    );
    const { x, y } = simulation.target;
    if (Math.hypot(simulation.ball.x - x, simulation.ball.y - y) < 1.5) {
      simulation.target = pickTarget(simulation);
    }
  }

  batch.push(
    ...simulation.players.map((player) => ({
      playerId: player.id,
      x: round2(player.x),
      y: round2(player.y),
    })),
    {
      ball: true,
      x: round2(clamp(simulation.ball.x, 0, 100)),
      y: round2(clamp(simulation.ball.y, 0, 100)),
    },
  );
  return batch;
}
