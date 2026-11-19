import { today } from '../common/validation/date.validators';

// El estado de un torneo no se guarda: se calcula con sus fechas cada vez que se consulta.
// Así no hay que actualizar nada cuando un torneo empieza o termina.
export enum TournamentStatus {
  POR_INICIAR = 'POR_INICIAR', // Todavía no empieza
  EN_CURSO = 'EN_CURSO', // Ya empezó y no ha llegado a su fecha de fin
  FINALIZADO = 'FINALIZADO', // Pasó su fecha de fin
}

// Lo que necesitan estas reglas. Sirve tanto la entidad como el DTO de respuesta.
interface TournamentDates {
  name: string;
  active: boolean;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
}

export function tournamentStatus(
  tournament: TournamentDates,
): TournamentStatus {
  const now = today();
  if (tournament.startDate > now) {
    return TournamentStatus.POR_INICIAR;
  }
  if (tournament.endDate < now) {
    return TournamentStatus.FINALIZADO;
  }
  return TournamentStatus.EN_CURSO;
}

// Por qué hoy no se pueden inscribir ni retirar equipos, o null si las inscripciones están abiertas.
// Se cierran al desactivar el torneo, cuando empieza o cuando pasa su cierre de inscripciones
// (ese día todavía cuenta como abierto).
export function registrationClosedReason(
  tournament: TournamentDates,
): string | null {
  const name = `"${tournament.name}"`;
  if (!tournament.active) {
    return `El torneo ${name} está desactivado`;
  }
  const now = today();
  if (tournament.startDate <= now) {
    return `El torneo ${name} ya inició (el ${tournament.startDate})`;
  }
  if (
    tournament.registrationDeadline &&
    tournament.registrationDeadline < now
  ) {
    return `Las inscripciones del torneo ${name} cerraron el ${tournament.registrationDeadline}`;
  }
  return null;
}
