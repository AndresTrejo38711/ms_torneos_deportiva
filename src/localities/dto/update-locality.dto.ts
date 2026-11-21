import { LocalityFieldsDto } from './locality-fields.dto';

// PUT reemplaza el nombre, la capacidad y la descripción. El escenario no cambia: la localidad es
// del escenario donde está (si quedó mal, se elimina y se crea en el otro). El estado se cambia con
// PATCH /localities/{id}/disable y /enable.
export class UpdateLocalityDto extends LocalityFieldsDto {}
