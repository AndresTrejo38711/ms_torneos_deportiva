import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Si ms_notificaciones no responde en este tiempo, ese correo se da por perdido.
const TIMEOUT_MS = 15000;

// Un correo listo para enviar.
export interface Email {
  to: string;
  subject: string;
  message: string;
}

// Cliente de ms_notificaciones, igual al NotificationClient de ms_torneos_security: este
// microservicio arma el mensaje y ms_notificaciones solo lo entrega (POST /enviar-correo).
//
// Un correo nunca tumba la operación que lo originó (una anotación o un resultado se guardan aunque
// el correo no salga): los errores quedan en el log, sin las direcciones de los aficionados.
@Injectable()
export class NotificationClient {
  private readonly logger = new Logger(NotificationClient.name);

  private readonly url: string | null;

  constructor(config: ConfigService) {
    const base = config.get<string>('NOTIFICATIONS_URL');
    this.url = base ? `${base.replace(/\/+$/, '')}/enviar-correo` : null;
    if (!this.url) {
      this.logger.warn(
        'NOTIFICATIONS_URL no está configurada: los correos de partidos y apuestas no se envían',
      );
    }
  }

  // Envía en segundo plano: quien llama no espera a ms_notificaciones. label dice qué se envió, para
  // el log ("partido nuevo", "apuesta registrada"...).
  deliver(emails: Email[], label: string): void {
    if (emails.length === 0) {
      return;
    }
    if (!this.url) {
      this.logger.log(
        `Correo "${label}" sin enviar (${emails.length}): falta NOTIFICATIONS_URL`,
      );
      return;
    }
    void Promise.all(emails.map((email) => this.send(email))).then((sent) => {
      const ok = sent.filter(Boolean).length;
      this.logger.log(
        `Correo "${label}": ${ok} de ${emails.length} enviados a ms_notificaciones`,
      );
    });
  }

  private async send(email: Email): Promise<boolean> {
    if (!this.url) {
      return false;
    }
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatario: email.to,
          asunto: email.subject,
          mensaje: email.message,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.error(
          `ms_notificaciones respondió ${response.status} al enviar "${email.subject}"`,
        );
      }
      return response.ok;
    } catch (error) {
      this.logger.error(
        `No se pudo enviar "${email.subject}": ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
