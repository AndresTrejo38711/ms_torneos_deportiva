import { TeamSummaryDto } from '../../teams/dto/team-response.dto';
import { DocumentType } from '../entities/document-type.enum';
import { DominantFoot } from '../entities/dominant-foot.enum';

// Lo que responde la API: nunca la entidad directamente.
export class PlayerResponseDto {
  id: number;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  position: string | null;
  nationality: string | null;
  heightCm: number | null; // estatura en centímetros
  dominantFoot: DominantFoot | null;
  photo: string | null; // "data:image/jpeg;base64,..."
  active: boolean;
  // Equipos en los que juega hoy, es decir, con contrato vigente (HU-GD-05), ordenados por nombre.
  // Normalmente es uno, pero nada impide que juegue en varios a la vez.
  currentTeams: TeamSummaryDto[];
}

// Lo mínimo para mostrar un jugador relacionado (por ejemplo, en la plantilla de un equipo).
// No lleva la foto: pesa mucho para ir repetida en cada fila de esas listas.
export class PlayerSummaryDto {
  id: number;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  position: string | null;
  active: boolean;
}
