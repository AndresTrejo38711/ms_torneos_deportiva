import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';
import { SkillCategory } from '../entities/skill-category.enum';

export class CreateSkillDto {
  @Trim()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(60, { message: 'El nombre debe tener máximo 60 caracteres' })
  name: string;

  // " tecnica " también se acepta: se limpia y se pasa a mayúsculas antes de validar.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @IsEnum(SkillCategory, {
    message: 'La categoría debe ser FISICA, TECNICA, TACTICA o MENTAL',
  })
  category: SkillCategory;

  @Trim()
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(255, {
    message: 'La descripción debe tener máximo 255 caracteres',
  })
  description?: string | null;
}
