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

  @Trim()
  @IsNotEmpty({ message: 'La ciudad es obligatoria' })
  @IsString({ message: 'La ciudad debe ser texto' })
  @MaxLength(60, { message: 'La ciudad debe tener máximo 60 caracteres' })
  city: string;

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
