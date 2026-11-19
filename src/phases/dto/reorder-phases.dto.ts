import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
} from 'class-validator';

// Cuerpo de PUT /phases/tournaments/{id}/order: todas las fases del torneo, en el orden en que se
// van a jugar. Ejemplo: { "phaseIds": [3, 1, 2] } deja la fase 3 de primera.
export class ReorderPhasesDto {
  @IsNotEmpty({ message: 'La lista de fases es obligatoria' })
  @IsArray({ message: 'Las fases deben ser una lista de ids: [3, 1, 2]' })
  @ArrayNotEmpty({ message: 'La lista de fases no puede estar vacía' })
  @ArrayUnique({ message: 'Una fase no puede aparecer dos veces en la lista' })
  @IsInt({ each: true, message: 'Cada id de fase debe ser un número entero' })
  @IsPositive({ each: true, message: 'Cada id de fase debe ser mayor que 0' })
  phaseIds: number[];
}
