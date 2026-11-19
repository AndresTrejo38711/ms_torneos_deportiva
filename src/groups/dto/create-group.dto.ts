import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

// Cuerpo de POST /groups: { "phaseId": 1, "name": "Grupo A" }
export class CreateGroupDto {
  @IsNotEmpty({ message: 'El id de la fase es obligatorio' })
  @IsInt({ message: 'El id de la fase debe ser un número entero' })
  @IsPositive({ message: 'El id de la fase debe ser mayor que 0' })
  phaseId: number;

  @Trim()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(30, { message: 'El nombre debe tener máximo 30 caracteres' })
  name: string;
}
