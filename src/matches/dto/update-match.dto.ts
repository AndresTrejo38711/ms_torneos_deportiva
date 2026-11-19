import { MatchFieldsDto } from './match-fields.dto';

// PUT reemplaza los datos del partido: mismas reglas que al crear. Solo mientras esté PROGRAMADO.
// La fase no cambia (si quedó mal, se elimina y se crea otro), y el estado se cambia con
// PATCH /matches/{id}/start y /cancel.
export class UpdateMatchDto extends MatchFieldsDto {}
