import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { LocalityFieldsDto } from './locality-fields.dto';

// Cuerpo de POST /localities: { "venueId": 3, "name": "Norte", "capacity": 4500 }
export class CreateLocalityDto extends LocalityFieldsDto {
  @IsNotEmpty({ message: 'El id del escenario es obligatorio' })
  @IsInt({ message: 'El id del escenario debe ser un número entero' })
  @IsPositive({ message: 'El id del escenario debe ser mayor que 0' })
  venueId: number;
}
