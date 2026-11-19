import { Module } from '@nestjs/common';
import { NotificationClient } from './notification.client';

// Correos de partidos y apuestas (HU-GC-06, HU-GC-07 y HU-GC-11) a través de ms_notificaciones. No
// depende de ningún otro módulo: el texto de cada correo lo arman match-emails.ts y bet-emails.ts.
@Module({
  providers: [NotificationClient],
  exports: [NotificationClient],
})
export class NotificationsModule {}
