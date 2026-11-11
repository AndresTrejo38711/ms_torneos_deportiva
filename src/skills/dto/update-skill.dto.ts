import { CreateSkillDto } from './create-skill.dto';

// PUT reemplaza todos los datos de la habilidad: mismas reglas que al crear.
// Una descripción omitida se borra.
export class UpdateSkillDto extends CreateSkillDto {}
