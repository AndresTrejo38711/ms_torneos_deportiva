import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { AuthenticatedUser } from './authenticated-user';

// Si ms_torneos_security no responde en este tiempo, la petición se rechaza (no se queda colgada).
const TIMEOUT_MS = 3000;

// Cliente de ms_torneos_security (guía 10 del profesor): reenvía el JWT que llegó del front y
// pregunta si ese usuario puede invocar la URL y el método. La respuesta es { allowed, userId, email }:
// si se permite, también dice quién es el usuario.
@Injectable()
export class SecurityClient {
  private readonly logger = new Logger(SecurityClient.name);

  private readonly validationUrl: string;

  constructor(config: ConfigService) {
    this.validationUrl = `${config.getOrThrow<string>('SECURITY_URL')}/api/internal/security/permissions-validation`;
  }

  // El usuario si tiene permiso; null si no lo tiene.
  async authorize(
    authorization: string,
    url: string,
    method: string,
  ): Promise<AuthenticatedUser | null> {
    let response: globalThis.Response;
    let body: unknown;
    try {
      response = await fetch(this.validationUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: JSON.stringify({ url, method }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      body = response.ok ? await response.json() : undefined;
    } catch (error) {
      // Caído, lento o con una respuesta que no es JSON: se falla cerrado, nunca se asume el permiso.
      // El log no incluye el token.
      this.logger.error(
        `No se pudo consultar a ms_torneos_security: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw unavailable();
    }

    // El token falta, no es válido o su sesión se cerró (logout) o expiró.
    if (response.status === 401) {
      throw new ApplicationException(
        ErrorCase.UNAUTHORIZED,
        'El token no es válido o su sesión fue cerrada o expiró',
      );
    }

    if (!response.ok) {
      this.logger.error(
        `ms_torneos_security respondió ${response.status} al validar ${method} ${url}`,
      );
      throw unavailable();
    }

    const user = allowedUser(body);
    if (!user) {
      this.logger.warn(`Permiso denegado: ${method} ${url}`);
    }
    return user;
  }
}

// El usuario de una respuesta { allowed: true, userId, email }. Cualquier otra cosa cuenta como
// denegado: se falla cerrado.
function allowedUser(body: unknown): AuthenticatedUser | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { allowed, userId, email } = body as Record<string, unknown>;
  if (
    allowed !== true ||
    typeof userId !== 'number' ||
    typeof email !== 'string'
  ) {
    return null;
  }
  return { id: userId, email };
}

function unavailable(): ApplicationException {
  return new ApplicationException(
    ErrorCase.SERVICE_UNAVAILABLE,
    'El servicio de seguridad no responde. Intenta de nuevo en unos segundos',
  );
}
