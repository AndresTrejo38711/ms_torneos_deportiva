import { FinalPhase } from './entities/final-phase.entity';
import { GroupPhase } from './entities/group-phase.entity';
import { Phase } from './entities/phase.entity';
import { PhaseType } from './entities/phase-type.enum';

// TypeORM arma cada fila de phases con su clase hija (GroupPhase o FinalPhase) según la columna
// "type", así que el tipo de una fase se sabe por su clase.
export function phaseTypeOf(phase: Phase): PhaseType {
  return phase instanceof GroupPhase ? PhaseType.GRUPOS : PhaseType.FINAL;
}

// Lo que el usuario lee en los mensajes.
export function phaseTypeLabel(type: PhaseType): string {
  return type === PhaseType.GRUPOS ? 'fase de grupos' : 'fase final';
}

export function isGroupPhase(phase: Phase): phase is GroupPhase {
  return phase instanceof GroupPhase;
}

export function isFinalPhase(phase: Phase): phase is FinalPhase {
  return phase instanceof FinalPhase;
}
