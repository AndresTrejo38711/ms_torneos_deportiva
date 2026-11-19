import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
  Unique,
} from 'typeorm';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { PhaseType } from './phase-type.enum';

// HU-GC-03. Etapa de un torneo. Es abstracta, como en el diagrama: toda fase es de grupos
// (GroupPhase) o final (FinalPhase).
//
// Herencia de tabla única: las tres clases se guardan en la misma tabla phases. La columna "type"
// dice de qué clase es cada fila, y las columnas propias de cada hija quedan en null en las filas de
// la otra. Así los partidos (HU-GC-06) apuntan a "una fase" sin importar su tipo, y las fases de un
// torneo salen de una sola consulta, en orden.
@Entity({ name: 'phases' })
@TableInheritance({ column: { type: 'enum', name: 'type', enum: PhaseType } })
// Un torneo no puede tener dos fases con el mismo nombre (sin distinguir mayúsculas ni tildes).
@Unique('uk_phase_tournament_name', ['tournament', 'name'])
export abstract class Phase {
  @PrimaryGeneratedColumn()
  id: number;

  // Cada fase pertenece a un único torneo. RESTRICT: no se borra un torneo que tenga fases.
  @ManyToOne(() => Tournament, (tournament) => tournament.phases, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'tournament_id',
    foreignKeyConstraintName: 'fk_phase_tournament',
  })
  tournament: Tournament;

  @Column({ length: 40 })
  name: string;

  // En qué orden se juega dentro del torneo: 1, 2, 3... Lo pone el sistema (cada fase nueva va al
  // final) y se cambia con "reordenar". La columna no se llama "order" porque es palabra de SQL.
  @Column({ name: 'phase_order', type: 'int' })
  order: number;
}
