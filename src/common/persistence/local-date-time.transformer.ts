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
      const pad = (n: number) => String(n).padStart(2, '0');
      return (
        `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` +
        `T${pad(value.getHours())}:${pad(value.getMinutes())}`
      );
    }
    if (typeof value === 'string') {
      return value.slice(0, 16).replace(' ', 'T');
    }
    return value;
  },
};
