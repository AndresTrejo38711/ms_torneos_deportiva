import { Transform } from 'class-transformer';

// Quita los espacios al inicio y al final de un texto antes de validarlo: "  Fútbol " → "Fútbol".
// Así "   " cuenta como vacío y no se guardan nombres que solo difieren en espacios.
export function Trim(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
