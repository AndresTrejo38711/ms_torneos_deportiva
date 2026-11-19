import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  IsBeforeDate,
  IsDateOnly,
  IsNotBeforeDate,
} from '../../common/validation/date.validators';
import { Trim } from '../../common/validation/trim.decorator';
import { TournamentCategory } from '../entities/tournament-category.enum';

export class CreateTournamentDto {
  @Trim()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(80, { message: 'El nombre debe tener máximo 80 caracteres' })
  name: string;

  @IsNotEmpty({ message: 'El id del deporte es obligatorio' })
  @IsInt({ message: 'El id del deporte debe ser un número entero' })
  @IsPositive({ message: 'El id del deporte debe ser mayor que 0' })
  sportId: number;

  // " masculino " también se acepta: se limpia y se pasa a mayúsculas antes de validar.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @IsEnum(TournamentCategory, {
    message: 'La categoría debe ser MASCULINO, FEMENINO o MIXTO',
  })
  category: TournamentCategory;

  // Puede ser pasada (para registrar torneos que ya se jugaron) o futura.
  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  @IsDateOnly({
    message:
      'La fecha de inicio debe ser una fecha real con el formato AAAA-MM-DD',
  })
  startDate: string;

  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  @IsDateOnly({
    message:
      'La fecha de fin debe ser una fecha real con el formato AAAA-MM-DD',
  })
  @IsNotBeforeDate('startDate', {
    message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
  })
  endDate: string;

  // Opcional. Último día para inscribir o retirar equipos; debe ser antes de que empiece.
  @IsOptional()
  @IsDateOnly({
    message:
      'El cierre de inscripciones debe ser una fecha real con el formato AAAA-MM-DD',
  })
  @IsBeforeDate('startDate', {
    message:
      'El cierre de inscripciones debe ser anterior a la fecha de inicio',
  })
  registrationDeadline?: string | null;
}
