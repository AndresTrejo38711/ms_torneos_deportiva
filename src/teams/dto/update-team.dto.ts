import { CreateTeamDto } from './create-team.dto';

// PUT reemplaza todos los datos del equipo: mismas reglas que al crear.
// Un nombre corto, una descripción o una fecha de fundación omitidos se borran.
// El estado activo/inactivo no se cambia aquí, sino con PATCH /teams/{id}/disable y /enable.
export class UpdateTeamDto extends CreateTeamDto {}
