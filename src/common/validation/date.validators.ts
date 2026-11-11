import { ValidateBy, ValidationOptions } from 'class-validator';

// Fechas sin hora, como texto "AAAA-MM-DD" (así las guarda MySQL en una columna DATE).
// Al ser texto con ese formato, se pueden comparar directamente: "1961-01-15" < "2026-11-10".

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// "2024-02-29" sí; "2023-02-30", "15/01/1961" o "2024-1-5" no.
export function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const match = DATE_ONLY.exec(value);
  if (!match) {
    return false;
  }
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// La fecha de hoy en la zona horaria del servidor, en el mismo formato "AAAA-MM-DD".
export function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Decorador para los DTO: el campo debe ser una fecha real con formato AAAA-MM-DD.
export function IsDateOnly(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isDateOnly',
      validator: {
        validate: (value) => isDateOnly(value),
        defaultMessage: () =>
          'La fecha debe ser una fecha real con el formato AAAA-MM-DD',
      },
    },
    options,
  );
}

// Decorador para los DTO: la fecha no puede ser posterior a hoy (fundación, nacimiento...).
// Si el formato es inválido no repite el error: de eso se encarga IsDateOnly.
export function IsNotFutureDate(
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isNotFutureDate',
      validator: {
        validate: (value) => !isDateOnly(value) || value <= today(),
        defaultMessage: () => 'La fecha no puede ser posterior a hoy',
      },
    },
    options,
  );
}

// Decorador para los DTO: la fecha no puede ser anterior a la de otro campo del mismo DTO
// (por ejemplo, el fin de un contrato frente a su inicio). Si alguna de las dos no es una fecha
// válida no repite el error: de eso se encarga IsDateOnly.
export function IsNotBeforeDate(
  property: string,
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isNotBeforeDate',
      constraints: [property],
      validator: {
        validate: (value, args) => {
          const dto = args?.object as Record<string, unknown> | undefined;
          const other = dto?.[property];
          return !isDateOnly(value) || !isDateOnly(other) || value >= other;
        },
        defaultMessage: () => `La fecha no puede ser anterior a ${property}`,
      },
    },
    options,
  );
}
