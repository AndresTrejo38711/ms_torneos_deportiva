// Estado del seguimiento en vivo de un partido (HU-GC-09). Lo cambia el administrador deportivo, y
// se finaliza solo cuando el partido recibe su resultado oficial o se cancela.
export enum TrackingStatus {
  SIN_INICIAR = 'SIN_INICIAR', // Nadie lo ha iniciado
  ACTIVO = 'ACTIVO', // Recibe posiciones (solo con el partido en juego)
  PAUSADO = 'PAUSADO', // No recibe posiciones; se reanuda con "iniciar"
  FINALIZADO = 'FINALIZADO', // Terminó: no se vuelve a abrir, pero nada se borra (criterio 16)
}

// Cómo se lee cada estado en los mensajes.
export const TRACKING_STATUS_LABEL: Record<TrackingStatus, string> = {
  [TrackingStatus.SIN_INICIAR]: 'sin iniciar',
  [TrackingStatus.ACTIVO]: 'activo',
  [TrackingStatus.PAUSADO]: 'en pausa',
  [TrackingStatus.FINALIZADO]: 'finalizado',
};
