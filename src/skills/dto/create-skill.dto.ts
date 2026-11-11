import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

export class CreateSkillDto {
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
}
