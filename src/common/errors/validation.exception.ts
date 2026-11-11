// Uno o varios campos del cuerpo no cumplen sus reglas. Se responde { campo: mensaje },
// igual que ms_torneos_security con @Valid.
export class ValidationException extends Error {
  constructor(readonly errors: Record<string, string>) {
    super('Los datos enviados no son válidos');
    this.name = 'ValidationException';
  }
}
