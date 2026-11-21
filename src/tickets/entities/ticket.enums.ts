// HU-GE-04. Estado de un boleto. Solo PENDIENTE cambia: los demás son finales.
export enum TicketStatus {
  PENDIENTE = 'PENDIENTE', // Generado; esperando que la pasarela confirme el pago
  PAGADO = 'PAGADO', // Pago aprobado: el boleto sirve para entrar
  RECHAZADO = 'RECHAZADO', // La pasarela no aprobó el pago: el boleto no sirve
  ANULADO = 'ANULADO', // El partido se canceló: se devuelve lo pagado
}

// Cómo se leen en los mensajes.
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  [TicketStatus.PENDIENTE]: 'pendiente de pago',
  [TicketStatus.PAGADO]: 'pagado',
  [TicketStatus.RECHAZADO]: 'rechazado',
  [TicketStatus.ANULADO]: 'anulado',
};
