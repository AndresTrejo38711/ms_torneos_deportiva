import { ValueTransformer } from 'typeorm';

// MySQL entrega las columnas DECIMAL como texto ("1.80") para no perder precisión. Las cuotas y los
// pagos de las apuestas tienen máximo 2 decimales, así que como número no se pierde nada.
export const DECIMAL_NUMBER: ValueTransformer = {
  to: (value: unknown) => value,
  from: (value: unknown) =>
    value === null || value === undefined ? null : Number(value),
};
