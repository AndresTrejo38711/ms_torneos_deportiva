import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  IsDateOnly,
  IsNotFutureDate,
} from '../../common/validation/date.validators';
import { Trim } from '../../common/validation/trim.decorator';
import { DocumentType } from '../entities/document-type.enum';

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
}
