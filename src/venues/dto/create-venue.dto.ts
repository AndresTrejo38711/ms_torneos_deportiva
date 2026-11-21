import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  IMAGE_DATA_URL,
  IMAGE_MAX_LENGTH,
} from '../../common/validation/image';
import { Trim } from '../../common/validation/trim.decorator';

// La dirección y la ciudad solo se piden a un escenario principal (sin parentId).
const isMainVenue = (dto: CreateVenueDto) => dto.parentId == null;

// Cuerpo de POST /venues:
// { "name": "Coliseo Mayor", "address": "Calle 10 # 5-20", "city": "Manizales" } o, para uno de
// adentro, { "name": "Cancha de tenis", "parentId": 3 }. Un escenario de adentro usa la dirección y
// la ciudad del que lo contiene: si se envían, se ignoran.
export class CreateVenueDto {
  @Trim()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(80, { message: 'El nombre debe tener máximo 80 caracteres' })
  name: string;

  @Trim()
  @ValidateIf(isMainVenue)
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @IsString({ message: 'La dirección debe ser texto' })
  @MaxLength(150, { message: 'La dirección debe tener máximo 150 caracteres' })
  address?: string | null;

  @Trim()
  @ValidateIf(isMainVenue)
  @IsNotEmpty({ message: 'La ciudad es obligatoria' })
  @IsString({ message: 'La ciudad debe ser texto' })
  @MaxLength(60, { message: 'La ciudad debe tener máximo 60 caracteres' })
  city?: string | null;

  @Trim()
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(255, {
    message: 'La descripción debe tener máximo 255 caracteres',
  })
  description?: string | null;

  // Opcional: llega ya reducida por el front. Sin ella (o en null) el escenario queda sin foto.
  @IsOptional()
  @IsString({ message: 'La foto debe ser una imagen JPG, PNG o WEBP' })
  @MaxLength(IMAGE_MAX_LENGTH, {
    message: 'La foto es demasiado grande: debe llegar reducida',
  })
  @Matches(IMAGE_DATA_URL, {
    message: 'La foto debe ser una imagen JPG, PNG o WEBP',
  })
  photo?: string | null;

  // Opcional: sin él (o en null) el escenario es principal; con él, queda dentro de ese escenario.
  @IsOptional()
  @IsInt({
    message: 'El id del escenario que lo contiene debe ser un número entero',
  })
  @IsPositive({
    message: 'El id del escenario que lo contiene debe ser mayor que 0',
  })
  parentId?: number | null;
}
