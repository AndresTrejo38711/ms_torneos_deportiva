// Tipo de etapa de un torneo (HU-GC-03). También es el valor que se guarda en la columna "type" de
// la tabla phases para saber de qué clase hija es cada fila.
export enum PhaseType {
  GRUPOS = 'GRUPOS', // Fase de grupos: tiene grupos y tabla de posiciones
  FINAL = 'FINAL', // Fase final (octavos, cuartos, semifinal, final): se juega por llaves
}
