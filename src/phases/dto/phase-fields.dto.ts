import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/validation/trim.decorator';
import { PhaseType } from '../entities/phase-type.enum';

// Cuántos equipos puede jugar una fase final: la final 2, la semifinal 4, cuartos 8, octavos 16...
// Siempre una potencia de 2, porque cada partido elimina a uno de los dos equipos.
export const FINAL_TEAMS_COUNTS = [2, 4, 8, 16, 32, 64];

// Si una fase de grupos no dice cuántos clasifican por grupo, pasan los dos primeros.
export const DEFAULT_QUALIFIERS_PER_GROUP = 2;

// Los datos de una fase que se pueden enviar al crearla y al editarla. Los de cada tipo solo se
// validan si la fase es de ese tipo.
export class PhaseFieldsDto {
  // " grupos " también se acepta: se limpia y se pasa a mayúsculas antes de validar.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'El tipo de fase es obligatorio' })
  @IsEnum(PhaseType, { message: 'El tipo de fase debe ser GRUPOS o FINAL' })
  type: PhaseType;

  @Trim()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(40, { message: 'El nombre debe tener máximo 40 caracteres' })
  name: string;

  // Solo en una fase de grupos, y opcional: si no llega, clasifican 2 por grupo.
  @ValidateIf(
    (dto: PhaseFieldsDto) =>
      dto.type === PhaseType.GRUPOS &&
      dto.qualifiersPerGroup !== undefined &&
      dto.qualifiersPerGroup !== null,
  )
  @IsInt({ message: 'Los clasificados por grupo deben ser un número entero' })
  @Min(1, { message: 'Los clasificados por grupo deben estar entre 1 y 16' })
  @Max(16, { message: 'Los clasificados por grupo deben estar entre 1 y 16' })
  qualifiersPerGroup?: number | null;

  // Solo en una fase final, y obligatorio.
  @ValidateIf((dto: PhaseFieldsDto) => dto.type === PhaseType.FINAL)
  @IsNotEmpty({
    message: 'El número de equipos es obligatorio en una fase final',
  })
  @IsIn(FINAL_TEAMS_COUNTS, {
    message:
      'El número de equipos de una fase final debe ser 2, 4, 8, 16, 32 o 64',
  })
  teamsCount?: number | null;
}
