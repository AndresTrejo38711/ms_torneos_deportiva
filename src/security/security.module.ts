import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { SecurityClient } from './security.client';

// APP_GUARD registra PermissionsGuard para todos los endpoints del microservicio:
// ninguno queda sin validar por olvido. Exporta SecurityClient para el socket de las pizarras
// (TrackingGateway, HU-GC-09), que valida a quien se une a una sala con la misma regla.
@Module({
  providers: [
    SecurityClient,
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [SecurityClient],
})
export class SecurityModule {}
