import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  IsDateOnly,
  IsNotFutureDate,
} from '../../common/validation/date.validators';
import { Trim } from '../../common/validation/trim.decorator';

export class CreateTeamDto {
  @Trim()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(60, { message: 'El nombre debe tener máximo 60 caracteres' })
  name: string;

  // Opcional. Por ejemplo "AT. Manizales".
  @Trim()
  @IsOptional()
  @IsString({ message: 'El nombre corto debe ser texto' })
  @MaxLength(30, { message: 'El nombre corto debe tener máximo 30 caracteres' })
  shortName?: string | null;

  @Trim()
  @IsNotEmpty({ message: 'La ciudad es obligatoria' })
  @IsString({ message: 'La ciudad debe ser texto' })
  @MaxLength(60, { message: 'La ciudad debe tener máximo 60 caracteres' })
  city: string;

  @Trim()
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(255, {
    message: 'La descripción debe tener máximo 255 caracteres',
  })
  description?: string | null;

  // Opcional. Formato AAAA-MM-DD, por ejemplo "1947-03-07".
  @IsOptional()
  @IsDateOnly({
    message:
      'La fecha de fundación debe ser una fecha real con el formato AAAA-MM-DD',
  })
  @IsNotFutureDate({
    message: 'La fecha de fundación no puede ser posterior a hoy',
  })
  foundationDate?: string | null;
}
