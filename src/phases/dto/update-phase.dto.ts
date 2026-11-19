import { PhaseFieldsDto } from './phase-fields.dto';

// PUT reemplaza los datos de la fase: mismas reglas que al crear. El tipo se envía para validar los
// campos que le corresponden, pero no se puede cambiar (si quedó mal, se elimina y se crea otra).
// El torneo tampoco cambia, y el orden se cambia con PUT /phases/tournaments/{id}/order.
export class UpdatePhaseDto extends PhaseFieldsDto {}
