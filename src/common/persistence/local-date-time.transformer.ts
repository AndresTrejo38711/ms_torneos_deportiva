import { ValueTransformer } from 'typeorm';

// Guarda una fecha y hora local ("2030-02-10T18:00") en una columna DATETIME y la devuelve igual.
// Sin esto, la base entrega un Date de JavaScript y la API lo respondería en UTC
// ("2030-02-10T23:00:00.000Z"), que confunde: el partido es a las 6 de la tarde, hora local.
export const LOCAL_DATE_TIME: ValueTransformer = {
  // "2030-02-10T18:00" → "2030-02-10 18:00:00", el formato que MySQL guarda tal cual.
  // Otros valores (null, o los operadores de una búsqueda) pasan sin cambios.
  to: (value: unknown) =>
    typeof value === 'string' ? `${value.replace('T', ' ')}:00` : value,

  // MySQL entrega un Date con la hora local del servidor: se vuelve a escribir como texto.
  from: (value: unknown) => {
    if (value instanceof Date) {
      return toLocalDateTime(value);
    }
    if (typeof value === 'string') {
      return value.slice(0, 16).replace(' ', 'T');
    }
    return value;
  },
};

// Un Date como "AAAA-MM-DDTHH:mm" en la hora local del servidor. Con ese formato las fechas se
// comparan como texto: "2030-02-10T18:00" < "2030-02-11T09:00".
export function toLocalDateTime(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` +
    `T${pad(value.getHours())}:${pad(value.getMinutes())}`
  );
}

// Un Date con segundos y milisegundos, "AAAA-MM-DDTHH:mm:ss.SSS" en la hora local del servidor: para
// las posiciones del seguimiento en vivo (HU-GC-09), que llegan varias por segundo.
export function toLocalTimestamp(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${toLocalDateTime(value)}:${pad(value.getSeconds())}` +
    `.${String(value.getMilliseconds()).padStart(3, '0')}`
  );
}

// Ahora mismo, en el mismo formato.
export function nowLocalDateTime(): string {
  return toLocalDateTime(new Date());
}
