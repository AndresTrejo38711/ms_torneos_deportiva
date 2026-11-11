import { CreateSportDto } from './create-sport.dto';

// PUT reemplaza todos los datos del deporte: mismas reglas que al crear.
// Lo que no se envíe queda vacío (una descripción omitida se borra; sin parentId pasa a ser principal).
// El estado activo/inactivo no se cambia aquí, sino con PATCH /sports/{id}/disable y /enable.
export class UpdateSportDto extends CreateSportDto {}
