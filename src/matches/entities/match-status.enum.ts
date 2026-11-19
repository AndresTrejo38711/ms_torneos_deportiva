// Estado de un partido (HU-GC-06). Lo cambia el administrador: no depende solo de la fecha, porque
// un partido puede empezar tarde, suspenderse o cancelarse.
export enum MatchStatus {
  PROGRAMADO = 'PROGRAMADO', // Al crearlo. Es el único estado en que se puede editar
  EN_JUEGO = 'EN_JUEGO', // Se inició (PATCH /matches/{id}/start)
  FINALIZADO = 'FINALIZADO', // Tiene resultado oficial (HU-GC-07)
  CANCELADO = 'CANCELADO', // Se canceló (PATCH /matches/{id}/cancel)
}

// Cómo se lee cada estado en los mensajes.
export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  [MatchStatus.PROGRAMADO]: 'programado',
  [MatchStatus.EN_JUEGO]: 'en juego',
  [MatchStatus.FINALIZADO]: 'finalizado',
  [MatchStatus.CANCELADO]: 'cancelado',
};
