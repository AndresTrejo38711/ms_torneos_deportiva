import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { SecurityClient } from './security.client';

// Los únicos métodos que un permiso puede tener en ms_torneos_security.
const PERMISSION_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

// Se ejecuta antes de cada endpoint (es global, ver SecurityModule). Es el equivalente al
// DynamicAuthorizationManager de ms_torneos_security, pero la decisión la toma ese microservicio:
// solo él sabe si la sesión sigue activa y qué permisos tienen los roles del usuario.
@Injectable()
export class PermissionsGuard implements CanActivate {
  // SECURITY_ENABLED=false en el .env apaga la validación, para probar los endpoints mientras
  // sus permisos todavía no están registrados en ms_torneos_security. Si la variable no existe,
  // la validación queda encendida: olvidarla nunca deja el microservicio abierto.
  private readonly enabled: boolean;

  constructor(
    private readonly securityClient: SecurityClient,
    config: ConfigService,
  ) {
    this.enabled = config.get<string>('SECURITY_ENABLED', 'true') !== 'false';
    if (!this.enabled) {
      new Logger(PermissionsGuard.name).warn(
        'SECURITY_ENABLED=false: las peticiones NO se validan contra ms_torneos_security. Solo para desarrollo',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const authorization = request.headers.authorization;
    if (!authorization) {
      throw new ApplicationException(
        ErrorCase.UNAUTHORIZED,
        'Debes iniciar sesión: falta el token de acceso',
      );
    }

    // HEAD, OPTIONS...: ningún permiso los cubre.
    if (!PERMISSION_METHODS.has(request.method)) {
      throw forbidden();
    }

    // La ruta completa, con el prefijo /api/deportiva y sin la query: es la que se registra en los
    // permisos (ej.: /api/deportiva/sports/{id}).
    const [url] = request.originalUrl.split('?');

    const allowed = await this.securityClient.isAllowed(
      authorization,
      url,
      request.method,
    );
    if (!allowed) {
      throw forbidden();
    }
    return true;
  }
}

function forbidden(): ApplicationException {
  return new ApplicationException(
    ErrorCase.FORBIDDEN,
    'Ninguno de tus roles tiene permiso para esta operación',
  );
}
