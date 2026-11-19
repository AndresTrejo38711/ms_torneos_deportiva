import { ScoreFieldsDto } from './score-fields.dto';

// PUT reemplaza los datos de la anotación: mismas reglas que al crearla. El partido no cambia (si
// quedó en otro partido, se elimina y se crea de nuevo).
export class UpdateScoreDto extends ScoreFieldsDto {}
