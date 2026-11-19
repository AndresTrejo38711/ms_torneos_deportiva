import { CreateTournamentDto } from './create-tournament.dto';

// PUT reemplaza todos los datos del torneo: mismas reglas que al crear.
// Un cierre de inscripciones omitido se borra (las inscripciones se cierran al empezar).
// El estado activo/inactivo no se cambia aquí, sino con PATCH /tournaments/{id}/disable y /enable.
export class UpdateTournamentDto extends CreateTournamentDto {}
