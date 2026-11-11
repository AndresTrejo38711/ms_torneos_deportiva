import { today } from '../common/validation/date.validators';
import { TeamPlayer } from './entities/team-player.entity';

// El estado de un contrato no se guarda: se calcula con sus fechas cada vez que se consulta.
// Así no hay que actualizar nada cuando un contrato empieza o termina.
export enum ContractStatus {
  VIGENTE = 'VIGENTE', // Ya empezó y no ha terminado
  FUTURO = 'FUTURO', // Todavía no empieza
  FINALIZADO = 'FINALIZADO', // Terminó en su fecha de fin
  RETIRADO = 'RETIRADO', // Se cerró antes con "retirar"
}

export function contractStatus(contract: TeamPlayer): ContractStatus {
  const now = today();
  if (contract.retiredAt) {
    return ContractStatus.RETIRADO;
  }
  if (contract.startDate > now) {
    return ContractStatus.FUTURO;
  }
  if (contract.endDate < now) {
    return ContractStatus.FINALIZADO;
  }
  return ContractStatus.VIGENTE;
}

// Hasta cuándo duró de verdad el contrato: la fecha de retiro si lo retiraron, si no, su fin.
export function effectiveEndDate(contract: TeamPlayer): string {
  return contract.retiredAt ?? contract.endDate;
}

// ¿El contrato ocupa algún día entre startDate y endDate? Dos rangos se cruzan si cada uno
// empieza antes de que el otro termine. Un contrato futuro que se retiró antes de empezar quedó
// cancelado: no ocupa ningún día y no se cruza con nada.
export function overlaps(
  contract: TeamPlayer,
  startDate: string,
  endDate: string,
): boolean {
  const end = effectiveEndDate(contract);
  if (end < contract.startDate) {
    return false;
  }
  return startDate <= end && endDate >= contract.startDate;
}
