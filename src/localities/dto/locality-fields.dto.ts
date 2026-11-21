import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

// Tope de capacidad de una localidad: más que la tribuna más grande de un estadio.
export const MAX_LOCALITY_CAPACITY = 200_000;
const CAPACITY_RANGE =
  'La capacidad debe ser un número entero entre 1 y 200.000';

// Los datos de una localidad que se envían al crearla y al editarla.
export class LocalityFieldsDto {
  @Trim()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(60, { message: 'El nombre debe tener máximo 60 caracteres' })
  name: string;

  @IsNotEmpty({ message: 'La capacidad es obligatoria' })
  @IsInt({ message: CAPACITY_RANGE })
  @Min(1, { message: CAPACITY_RANGE })
  @Max(MAX_LOCALITY_CAPACITY, { message: CAPACITY_RANGE })
  capacity: number;

  @Trim()
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(255, {
    message: 'La descripción debe tener máximo 255 caracteres',
  })
  description?: string | null;
}
