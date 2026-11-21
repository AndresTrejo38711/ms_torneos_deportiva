import { CreateVenueDto } from './create-venue.dto';

// PUT reemplaza todos los datos del escenario: mismas reglas que al crear. Lo que no se envíe queda
// vacío (una foto omitida se borra; sin parentId pasa a ser principal y entonces pide dirección y
// ciudad). El estado activo/inactivo no se cambia aquí, sino con PATCH /venues/{id}/disable y /enable.
export class UpdateVenueDto extends CreateVenueDto {}
