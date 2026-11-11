import { CreateSkillDto } from './create-skill.dto';

// PUT reemplaza todos los datos de la habilidad: mismas reglas que al crear.
// Una descripción omitida se borra.
// El estado activo/inactivo no se cambia aquí, sino con PATCH /skills/{id}/disable y /enable.
export class UpdateSkillDto extends CreateSkillDto {}
