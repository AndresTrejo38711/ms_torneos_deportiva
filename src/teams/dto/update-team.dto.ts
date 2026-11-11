import { CreateTeamDto } from './create-team.dto';

// PUT reemplaza todos los datos del equipo: mismas reglas que al crear.
// Una fecha de fundación omitida se borra.
// El estado activo/inactivo no se cambia aquí, sino con PATCH /teams/{id}/disable y /enable.
export class UpdateTeamDto extends CreateTeamDto {}
