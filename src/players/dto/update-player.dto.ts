import { CreatePlayerDto } from './create-player.dto';

// PUT reemplaza todos los datos del jugador: mismas reglas que al crear. Los datos opcionales que
// no se envíen (posición, nacionalidad, estatura, pie dominante, foto) se borran.
// El estado activo/inactivo no se cambia aquí, sino con PATCH /players/{id}/disable y /enable.
export class UpdatePlayerDto extends CreatePlayerDto {}
