import { ChildEntity, Column } from 'typeorm';
import { Phase } from './phase.entity';
import { PhaseType } from './phase-type.enum';

// HU-GC-05. Fase final: una etapa decisiva que se juega por llaves (octavos, cuartos, semifinal,
// final). Se guarda en la tabla phases con type = 'FINAL'.
@ChildEntity(PhaseType.FINAL)
export class FinalPhase extends Phase {
  // Cuántos equipos la juegan: Final 2, Semifinal 4, Cuartos 8, Octavos 16... Sirve para dibujar la
  // llave y para saber cuántos partidos tiene (la mitad). En la base admite null porque las fases de
  // grupos no la usan.
  @Column({ name: 'teams_count', type: 'int', nullable: true })
  teamsCount: number;
}
