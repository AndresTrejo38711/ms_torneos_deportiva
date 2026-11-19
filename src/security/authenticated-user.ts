import type { Request } from 'express';

// Quién hace la petición, según ms_torneos_security (su id de usuario allá y su correo, leído de su
// base). Lo deja el PermissionsGuard en la petición cuando el permiso se concede.
export interface AuthenticatedUser {
  id: number;
  email: string;
}

// La petición de Express con el usuario que dejó el guard. Con SECURITY_ENABLED=false no hay usuario.
export type RequestWithUser = Request & { user?: AuthenticatedUser };
