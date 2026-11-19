import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { AuthenticatedUser, RequestWithUser } from './authenticated-user';

// Parámetro de un controller: el usuario que hace la petición (lo dejó el PermissionsGuard). Lo usan
// las rutas que trabajan sobre "lo mío", como los métodos de pago del aficionado (HU-GC-10).
//
// Con SECURITY_ENABLED=false no se le pregunta a ms_torneos_security, así que no hay forma de saber
// quién es: esas rutas responden 401 en vez de inventar un usuario.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new ApplicationException(
        ErrorCase.UNAUTHORIZED,
        'Esta operación necesita saber quién eres: requiere la validación con ms_torneos_security encendida (SECURITY_ENABLED=true) y un token de acceso',
      );
    }
    return request.user;
  },
);
