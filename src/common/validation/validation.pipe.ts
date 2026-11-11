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
function collectMessages(
  errors: ValidationError[],
  parent = '',
  result: Record<string, string> = {},
): Record<string, string> {
  for (const error of errors) {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const [message] = Object.values(error.constraints ?? {});
    if (message && !(field in result)) {
      result[field] = message;
    }
    if (error.children?.length) {
      collectMessages(error.children, field, result);
    }
  }
  return result;
}
