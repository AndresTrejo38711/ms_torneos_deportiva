import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { PAYMENT_METHOD_CATALOG } from './payment-methods.catalog';

// Al arrancar deja el catálogo de métodos de pago (como el DatabaseSeeder de ms_torneos_security):
// solo crea los que falten, por su código. Si alguien cambió uno en la base, lo respeta.
@Injectable()
export class PaymentMethodsSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentMethodsSeeder.name);

  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = new Set(
      (await this.paymentMethodRepository.find()).map((method) => method.code),
    );
    const missing = PAYMENT_METHOD_CATALOG.filter(
      (method) => !existing.has(method.code),
    );
    if (missing.length === 0) {
      return;
    }
    await this.paymentMethodRepository.save(
      missing.map((method) => this.paymentMethodRepository.create(method)),
    );
    this.logger.log(
      `Catálogo de métodos de pago: se crearon ${missing.length} (${missing.map((method) => method.name).join(', ')})`,
    );
  }
}
