// HU-GC-11. Por quién apuesta el aficionado.
export enum BetSelection {
  LOCAL = 'LOCAL',
  EMPATE = 'EMPATE', // Solo en fase de grupos
  VISITANTE = 'VISITANTE',
}

// Estado de una apuesta. Solo PENDIENTE cambia: los demás son finales.
export enum BetStatus {
  PENDIENTE = 'PENDIENTE', // Registrada; el partido no ha terminado
  GANADA = 'GANADA', // Acertó: se paga valor × cuota
  PERDIDA = 'PERDIDA', // No acertó: se paga 0
  ANULADA = 'ANULADA', // El partido se canceló: se devuelve el valor
  CANCELADA = 'CANCELADA', // El aficionado la canceló antes del partido: se devuelve el valor
}

// Cómo se leen en los mensajes.
export const BET_STATUS_LABEL: Record<BetStatus, string> = {
  [BetStatus.PENDIENTE]: 'pendiente',
  [BetStatus.GANADA]: 'ganada',
  [BetStatus.PERDIDA]: 'perdida',
  [BetStatus.ANULADA]: 'anulada',
  [BetStatus.CANCELADA]: 'cancelada',
};
