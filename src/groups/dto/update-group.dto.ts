import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';

// Cuerpo de PUT /groups/{id}: solo el nombre. Un grupo no cambia de fase; sus equipos se manejan
// con /group-teams.
export class UpdateGroupDto {
  @Trim()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(30, { message: 'El nombre debe tener máximo 30 caracteres' })
  name: string;
}
