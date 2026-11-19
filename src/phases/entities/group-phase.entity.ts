import { ChildEntity, Column, OneToMany } from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { Phase } from './phase.entity';
import { PhaseType } from './phase-type.enum';

// HU-GC-03 y HU-GC-04. Fase de grupos: los equipos se reparten en grupos y cada grupo tiene su
// tabla de posiciones. Se guarda en la tabla phases con type = 'GRUPOS'.
@ChildEntity(PhaseType.GRUPOS)
export class GroupPhase extends Phase {
  // Cuántos equipos de cada grupo pasan a la siguiente fase (el mockup de la HU-GC-08 los pinta de
  // verde). En la base la columna admite null porque las fases finales no la usan.
  @Column({ name: 'qualifiers_per_group', type: 'int', nullable: true })
  qualifiersPerGroup: number;

  // HU-GC-04. Sus grupos. La llave foránea phase_id está en la tabla de grupos.
  @OneToMany(() => Group, (group) => group.phase)
  groups: Group[];
}
