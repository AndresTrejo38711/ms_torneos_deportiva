import { DocumentType } from '../entities/document-type.enum';

// Lo que responde la API: nunca la entidad directamente.
export class PlayerResponseDto {
  id: number;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  active: boolean;
}

// Lo mínimo para mostrar un jugador relacionado (por ejemplo, en la plantilla de un equipo).
export class PlayerSummaryDto {
  id: number;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  active: boolean;
}
