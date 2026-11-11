import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';

// Si ms_torneos_security no responde en este tiempo, la petición se rechaza (no se queda colgada).
const TIMEOUT_MS = 3000;

// Cliente de ms_torneos_security (guía 10 del profesor): reenvía el JWT que llegó del front y
// pregunta si ese usuario puede invocar la URL y el método. La respuesta es { allowed }.
@Injectable()
export class SecurityClient {
  private readonly logger = new Logger(SecurityClient.name);

  private readonly validationUrl: string;

  constructor(config: ConfigService) {
    this.validationUrl = `${config.getOrThrow<string>('SECURITY_URL')}/api/internal/security/permissions-validation`;
  }

  async isAllowed(
    authorization: string,
    url: string,
    method: string,
  ): Promise<boolean> {
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

    const allowed =
      typeof body === 'object' &&
      body !== null &&
      'allowed' in body &&
      body.allowed === true;
    if (!allowed) {
      this.logger.warn(`Permiso denegado: ${method} ${url}`);
    }
    return allowed;
  }
}

function unavailable(): ApplicationException {
  return new ApplicationException(
    ErrorCase.SERVICE_UNAVAILABLE,
    'El servicio de seguridad no responde. Intenta de nuevo en unos segundos',
  );
}
