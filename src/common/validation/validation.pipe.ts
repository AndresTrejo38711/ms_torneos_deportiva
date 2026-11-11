import { ValidationError, ValidationPipe } from '@nestjs/common';
import { ValidationException } from '../errors/validation.exception';

// Valida el cuerpo de cada petición contra su DTO (el equivalente a @Valid en Spring).
// - whitelist: descarta los campos que el DTO no declara, en vez de guardarlos.
// - transform: entrega al controlador una instancia del DTO, con los tipos ya convertidos.
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new ValidationException(collectMessages(errors)),
  });
}

// Un mensaje por campo; los campos de objetos anidados quedan como "padre.hijo".
// Si un campo incumple varias reglas, se muestra una sola:
// - si falta, la de "obligatorio" (decir que un campo vacío "debe ser texto" confunde);
// - si no, la del decorador escrito más arriba en el DTO. class-validator entrega los errores
//   del último decorador al primero, por eso se toma el último de la lista.
function collectMessages(
  errors: ValidationError[],
  parent = '',
  result: Record<string, string> = {},
): Record<string, string> {
  for (const error of errors) {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const constraints = error.constraints ?? {};
    const message =
      constraints.isNotEmpty ??
      constraints.isDefined ??
      Object.values(constraints).at(-1);
    if (message && !(field in result)) {
      result[field] = message;
    }
    if (error.children?.length) {
      collectMessages(error.children, field, result);
    }
  }
  return result;
}
