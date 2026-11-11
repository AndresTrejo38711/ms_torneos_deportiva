import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

export class CreateSportDto {
  @Trim()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(60, { message: 'El nombre debe tener máximo 60 caracteres' })
  name: string;

  @Trim()
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(255, {
    message: 'La descripción debe tener máximo 255 caracteres',
  })
  description?: string | null;

  // Opcional: sin él (o en null) el deporte es principal; con él, es subdeporte de ese deporte.
  @IsOptional()
  @IsInt({ message: 'El id del deporte padre debe ser un número entero' })
  @IsPositive({ message: 'El id del deporte padre debe ser mayor que 0' })
  parentId?: number | null;
}
