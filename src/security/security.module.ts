import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { SecurityClient } from './security.client';

// APP_GUARD registra PermissionsGuard para todos los endpoints del microservicio:
// ninguno queda sin validar por olvido.
@Module({
  providers: [
    SecurityClient,
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class SecurityModule {}
