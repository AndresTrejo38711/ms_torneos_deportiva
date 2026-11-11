import { HttpStatus } from '@nestjs/common';

// Mismos casos que ms_torneos_security: el front ya sabe leer { errorCase, message }.
export enum ErrorCase {
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  INVALID_OPERATION = 'INVALID_OPERATION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  // Un servicio del que depende la operación (por ejemplo, el de seguridad) no respondió.
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// Código HTTP de cada caso.
export const ERROR_CASE_STATUS: Record<ErrorCase, HttpStatus> = {
  [ErrorCase.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCase.ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [ErrorCase.INVALID_OPERATION]: HttpStatus.BAD_REQUEST,
  [ErrorCase.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCase.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCase.SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
};
