import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ApplicationException } from './application.exception';
import { ERROR_CASE_STATUS } from './error-case.enum';
import { ValidationException } from './validation.exception';

interface ErrorResponse {
  status: number;
  body: Record<string, string>;
}

// Códigos de MySQL cuando un cambio choca con una regla de unicidad o de relación.
const MYSQL_CONFLICT_CODES = new Set([
  'ER_DUP_ENTRY',
  'ER_ROW_IS_REFERENCED_2',
  'ER_NO_REFERENCED_ROW_2',
]);

// Equivalente al GlobalExceptionHandler de ms_torneos_security: todo error sale con el mismo
// formato JSON y nunca como un 500 con detalles internos.
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { status, body } = this.toErrorResponse(exception, request);
    response.status(status).json(body);
  }

  private toErrorResponse(exception: unknown, request: Request): ErrorResponse {
    if (exception instanceof ApplicationException) {
      return error(
        ERROR_CASE_STATUS[exception.errorCase],
        exception.errorCase,
        exception.message,
      );
    }

    if (exception instanceof ValidationException) {
      return { status: HttpStatus.BAD_REQUEST, body: exception.errors };
    }

    // La base de datos rechazó el cambio por una regla de unicidad o de relación. Los services ya
    // validan estos casos; esto cubre, por ejemplo, dos registros iguales creados a la vez.
    if (
      exception instanceof QueryFailedError &&
      MYSQL_CONFLICT_CODES.has(mysqlCode(exception))
    ) {
      this.logger.warn(
        `Cambio rechazado por la base de datos: ${exception.message}`,
      );
      return error(
        HttpStatus.CONFLICT,
        'DATA_CONFLICT',
        'El cambio choca con datos que ya existen o que dependen de este registro. Recarga e intenta de nuevo',
      );
    }

    // Los services usan ApplicationException para "no existe": este 404 es de Nest, cuando
    // ningún controlador atiende la URL.
    if (exception instanceof NotFoundException) {
      // originalUrl y no path: en este punto path ya no incluye el prefijo /api/deportiva.
      const [path] = request.originalUrl.split('?');
      return error(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        `La ruta ${request.method} ${path} no existe en este servicio`,
      );
    }

    // Un 400 de Nest que no viene de la validación de los DTO: el cuerpo no es un JSON válido.
    if (
      exception instanceof HttpException &&
      exception.getStatus() === HttpStatus.BAD_REQUEST
    ) {
      return error(
        HttpStatus.BAD_REQUEST,
        'INVALID_BODY',
        'El cuerpo de la petición no es válido: revisa el formato JSON',
      );
    }

    if (exception instanceof HttpException) {
      return error(exception.getStatus(), 'HTTP_ERROR', exception.message);
    }

    // Lo que no se esperaba: al cliente no se le muestran detalles, pero la causa queda en la consola.
    this.logger.error(
      `Error no controlado en ${request.method} ${request.originalUrl}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return error(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_ERROR',
      'Ocurrió un error interno en el servidor',
    );
  }
}

function error(
  status: number,
  errorCase: string,
  message: string,
): ErrorResponse {
  return { status, body: { errorCase, message } };
}

function mysqlCode(exception: QueryFailedError): string {
  const driverError: unknown = exception.driverError;
  if (driverError && typeof driverError === 'object' && 'code' in driverError) {
    return String(driverError.code);
  }
  return '';
}
