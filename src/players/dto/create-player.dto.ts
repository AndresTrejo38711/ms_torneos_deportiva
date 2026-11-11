import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  IsDateOnly,
  IsNotFutureDate,
} from '../../common/validation/date.validators';
import { Trim } from '../../common/validation/trim.decorator';
import { DocumentType } from '../entities/document-type.enum';
import { DominantFoot } from '../entities/dominant-foot.enum';

// La foto llega ya reducida por el front (256 × 256 px, unos 20 KB) como texto
// "data:image/jpeg;base64,...". El límite deja margen y cabe en los 100 KB que Nest acepta por
// petición. No se aceptan SVG: pueden llevar código adentro.
const PHOTO_MAX_LENGTH = 90_000;
const PHOTO_FORMAT =
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export class CreatePlayerDto {
  // " cc " también se acepta: se limpia y se pasa a mayúsculas antes de validar.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  @IsEnum(DocumentType, {
    message: 'El tipo de documento debe ser CC, TI, CE o PA',
  })
  documentType: DocumentType;

  @Trim()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @IsString({ message: 'El número de documento debe ser texto' })
  @MaxLength(20, {
    message: 'El número de documento debe tener máximo 20 caracteres',
  })
  @Matches(/^[A-Za-z0-9]+$/, {
    message:
      'El número de documento solo puede tener letras y números, sin puntos ni espacios',
  })
  documentNumber: string;

  @Trim()
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  @IsString({ message: 'Los nombres deben ser texto' })
  @MaxLength(60, { message: 'Los nombres deben tener máximo 60 caracteres' })
  firstName: string;

  @Trim()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  @IsString({ message: 'Los apellidos deben ser texto' })
  @MaxLength(60, { message: 'Los apellidos deben tener máximo 60 caracteres' })
  lastName: string;

  // Formato AAAA-MM-DD, por ejemplo "2001-04-23".
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  @IsDateOnly({
    message:
      'La fecha de nacimiento debe ser una fecha real con el formato AAAA-MM-DD',
  })
  @IsNotFutureDate({
    message: 'La fecha de nacimiento no puede ser posterior a hoy',
  })
  birthDate: string;

  // Opcional. Texto corto, por ejemplo "Delantero" o "DEL".
  @Trim()
  @IsOptional()
  @IsString({ message: 'La posición debe ser texto' })
  @MaxLength(30, { message: 'La posición debe tener máximo 30 caracteres' })
  position?: string | null;

  // Opcional. País de origen, por ejemplo "Colombia".
  @Trim()
  @IsOptional()
  @IsString({ message: 'La nacionalidad debe ser texto' })
  @MaxLength(60, {
    message: 'La nacionalidad debe tener máximo 60 caracteres',
  })
  nationality?: string | null;

  // Opcional. Estatura en centímetros: 180 es 1,80 m.
  @IsOptional()
  @IsInt({ message: 'La estatura debe ser un número entero de centímetros' })
  @Min(100, { message: 'La estatura debe estar entre 100 y 250 centímetros' })
  @Max(250, { message: 'La estatura debe estar entre 100 y 250 centímetros' })
  heightCm?: number | null;

  // Opcional. " derecho " también se acepta; "" cuenta como sin dato.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || null : value,
  )
  @IsOptional()
  @IsEnum(DominantFoot, {
    message: 'El pie dominante debe ser DERECHO, IZQUIERDO o AMBIDIESTRO',
  })
  dominantFoot?: DominantFoot | null;

  // Opcional. Imagen pequeña como texto: "data:image/jpeg;base64,...".
  @IsOptional()
  @IsString({ message: 'La foto debe ser una imagen JPG, PNG o WEBP' })
  @MaxLength(PHOTO_MAX_LENGTH, {
    message: 'La foto es demasiado grande: debe llegar reducida',
  })
  @Matches(PHOTO_FORMAT, {
    message: 'La foto debe ser una imagen JPG, PNG o WEBP',
  })
  photo?: string | null;
}
