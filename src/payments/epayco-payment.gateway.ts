import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { pesos } from '../notifications/email-format';
import {
  PaymentCheck,
  PaymentGateway,
  PaymentRequest,
  PaymentResult,
  PaymentStart,
} from './payment-gateway';

// ePayco (ahora Davipay) con su Smart Checkout. Documentación: docs.davipay.com, "Implementación" y
// "Páginas de Respuesta y Confirmación" del checkout.
//
// 1. start(): el back inicia sesión en Apify con las llaves y crea una sesión de pago por el total de
//    la compra (la referencia de la compra va como factura). El front abre el checkout de ePayco con
//    ese sessionId: el número de la tarjeta se escribe allá, nunca en este sistema.
// 2. check(): con la ref_payco que ePayco le da al aficionado al pagar, el back le pregunta a ePayco
//    cómo quedó ese pago, y revisa que sea de esta cuenta, de esta compra y por el total.
const APIFY_URL = 'https://apify.epayco.co';
const VALIDATION_URL = 'https://secure.epayco.co/validation/v1/reference';

// Si ePayco no responde en este tiempo, la compra se da por no iniciada (o el pago, por no consultado).
const TIMEOUT_MS = 20000;

// Medios de pago de ePayco que se pueden ocultar del checkout (methodsDisable): tarjeta, PSE,
// SafetyPay, efectivo y Daviplata.
const EPAYCO_METHODS = ['TDC', 'PSE', 'SP', 'CASH', 'DP'];

// El medio de ePayco que corresponde a cada método del catálogo (criterio 18): el checkout muestra
// solo ese. Nequi no está en ePayco: con Nequi se muestran todos.
const EPAYCO_METHOD_OF: Record<string, string> = {
  TARJETA_CREDITO: 'TDC',
  TARJETA_DEBITO: 'TDC',
  PSE: 'PSE',
  DAVIPLATA: 'DP',
};

// x_cod_response de ePayco: 1 aceptada; 3 pendiente, 7 retenida y 8 iniciada todavía pueden
// terminar aprobadas. Las demás (rechazada, fallida, reversada, caducada, abandonada, cancelada) no.
const APPROVED = 1;
const STILL_PENDING = [3, 7, 8];

type Json = Record<string, unknown>;

function textOf(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

export class EpaycoPaymentGateway extends PaymentGateway {
  readonly name = 'ePayco';

  private readonly logger = new Logger(EpaycoPaymentGateway.name);

  private readonly publicKey: string;

  private readonly privateKey: string;

  private readonly customerId: string;

  // true: modo de pruebas (tarjetas de prueba, sin dinero real).
  private readonly test: boolean;

  // Donde ePayco devuelve al aficionado al terminar de pagar (agrega ?ref_payco=...). null si el front
  // está en localhost: ePayco no acepta ese nombre (sí 127.0.0.1 o un dominio), así que no se envía y el
  // front confirma el pago con lo que le entrega el checkout (onResponse).
  private readonly responseUrl: string | null;

  constructor(config: ConfigService) {
    super();
    const required = (key: string): string => {
      const value = config.get<string>(key)?.trim();
      if (!value) {
        throw new Error(
          `Falta ${key} en el .env: la pasarela ePayco (PAYMENTS_PROVIDER=epayco) la necesita`,
        );
      }
      return value;
    };
    this.publicKey = required('EPAYCO_PUBLIC_KEY');
    this.privateKey = required('EPAYCO_PRIVATE_KEY');
    this.customerId = required('EPAYCO_P_CUST_ID_CLIENTE');
    this.test = config.get<string>('EPAYCO_TEST') !== 'false';
    const front = config
      .get<string>('FRONT_URL', 'http://localhost:5173')
      .trim()
      .replace(/\/+$/, '');
    let host: string;
    try {
      host = new URL(front).hostname;
    } catch {
      throw new Error(
        `FRONT_URL debe ser una dirección como http://localhost:5173 (en el .env dice "${front}")`,
      );
    }
    this.responseUrl = host === 'localhost' ? null : `${front}/#mis-boletos`;
    this.logger.log(
      `Pagos con ePayco ${this.test ? 'en modo de pruebas' : 'EN PRODUCCIÓN (dinero real)'}`,
    );
    if (!this.responseUrl) {
      this.logger.log(
        'ePayco no acepta localhost como página de regreso: el front confirma el pago al cerrar el checkout',
      );
    }
  }

  async start(request: PaymentRequest): Promise<PaymentStart> {
    const token = await this.login();
    const keep = EPAYCO_METHOD_OF[request.method.code];
    const body = await this.call(`${APIFY_URL}/payment/session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        checkout_version: '2',
        name: 'Arcanos',
        description: request.description,
        currency: 'COP',
        amount: request.amount,
        country: 'CO',
        lang: 'ES',
        invoice: request.reference,
        ...(this.responseUrl ? { response: this.responseUrl } : {}),
        methodsDisable: keep ? EPAYCO_METHODS.filter((m) => m !== keep) : [],
        billing: { email: request.buyerEmail },
      }),
    });
    const sessionId = textOf((body.data as Json | undefined)?.sessionId);
    if (body.success !== true || !sessionId) {
      const errors = (body.data as Json | undefined)?.errors;
      const details = Array.isArray(errors)
        ? errors.map((error: Json) => textOf(error.errorMessage)).join(' | ')
        : '';
      this.logger.error(
        `ePayco no creó la sesión de pago de ${request.reference}: ${textOf(body.textResponse) || 'sin detalle'}${details ? ` (${details})` : ''}`,
      );
      throw new ApplicationException(
        ErrorCase.SERVICE_UNAVAILABLE,
        `ePayco no pudo iniciar el pago: ${textOf(body.textResponse) || 'intenta de nuevo en unos minutos'}`,
      );
    }
    this.logger.log(
      `Sesión de pago de ePayco creada para ${request.reference}`,
    );
    return { status: 'PENDIENTE', checkout: { sessionId, test: this.test } };
  }

  async check(request: PaymentCheck): Promise<PaymentResult> {
    const ref = request.gatewayReference;
    const body = await this.call(
      `${VALIDATION_URL}/${encodeURIComponent(ref)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    const data = body.data as Json | undefined;
    if (body.success !== true || !data || typeof data !== 'object') {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `ePayco no tiene un pago con la referencia ${ref}`,
      );
    }

    // Que el pago sea de esta cuenta de ePayco, de esta compra y por el total (si no, alguien podría
    // confirmar una compra con el pago de otra).
    const merchant = textOf(data.x_cust_id_cliente);
    const invoice = textOf(data.x_id_invoice) || textOf(data.x_id_factura);
    if (
      (merchant && merchant !== this.customerId) ||
      invoice !== request.reference
    ) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El pago ${ref} de ePayco no es de la compra ${request.reference}`,
      );
    }
    const amount = Number(textOf(data.x_amount));
    if (amount !== request.amount || textOf(data.x_currency_code) !== 'COP') {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El pago ${ref} de ePayco es por ${Number.isFinite(amount) ? pesos(amount) : 'otro valor'} y la compra es de ${pesos(request.amount)}`,
      );
    }
    if (!this.test && textOf(data.x_test_request).toLowerCase() === 'true') {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El pago ${ref} de ePayco es de pruebas: no paga boletos reales`,
      );
    }

    const code = Number(
      textOf(data.x_cod_response) || textOf(data.x_cod_transaction_state),
    );
    const reason =
      textOf(data.x_response_reason_text) ||
      textOf(data.x_response) ||
      'sin detalle';
    this.logger.log(
      `Pago ${request.reference} en ePayco: código ${code} (${textOf(data.x_response)})`,
    );
    if (code === APPROVED) {
      return { status: 'APROBADO' };
    }
    if (STILL_PENDING.includes(code)) {
      return { status: 'PENDIENTE', reason };
    }
    return { status: 'RECHAZADO', reason };
  }

  // ---------------------------------------------------------------------------------------------

  // Token de Apify para crear la sesión (dura unos minutos: se pide uno por compra).
  private async login(): Promise<string> {
    const credentials = Buffer.from(
      `${this.publicKey}:${this.privateKey}`,
    ).toString('base64');
    const body = await this.call(`${APIFY_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
    });
    const token = textOf(body.token);
    if (!token) {
      this.logger.error(
        'ePayco no entregó el token de Apify: revisa EPAYCO_PUBLIC_KEY y EPAYCO_PRIVATE_KEY',
      );
      throw new ApplicationException(
        ErrorCase.SERVICE_UNAVAILABLE,
        'ePayco no aceptó las llaves de este comercio: no se pudo iniciar el pago',
      );
    }
    return token;
  }

  // Llama a ePayco y devuelve el JSON de la respuesta ({} si no trae JSON). Nunca escribe en el log
  // las llaves ni el token.
  private async call(url: string, init: RequestInit): Promise<Json> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(
        `ePayco no respondió (${new URL(url).pathname}): ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ApplicationException(
        ErrorCase.SERVICE_UNAVAILABLE,
        'ePayco no respondió: intenta de nuevo en unos minutos',
      );
    }
    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      this.logger.warn(
        `ePayco respondió ${response.status} en ${new URL(url).pathname}`,
      );
    }
    return body && typeof body === 'object' ? (body as Json) : {};
  }
}
