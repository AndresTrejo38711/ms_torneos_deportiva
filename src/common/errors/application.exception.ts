import { ErrorCase } from './error-case.enum';

// Error de negocio: los services lanzan este y GlobalExceptionFilter lo convierte en
// { errorCase, message } con el código HTTP del caso.
export class ApplicationException extends Error {
  constructor(
    readonly errorCase: ErrorCase,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationException';
  }
}
