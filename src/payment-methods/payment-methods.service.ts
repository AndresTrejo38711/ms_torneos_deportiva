import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';
import { PaymentMethod } from './entities/payment-method.entity';
import { toPaymentMethodResponse } from './payment-methods.mapper';

// HU-GC-10 · Catálogo de métodos de pago (solo consulta).
@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
  ) {}

  // En el orden en que se sembraron.
  async findAll(): Promise<PaymentMethodResponseDto[]> {
    const methods = await this.paymentMethodRepository.find({
      order: { id: 'ASC' },
    });
    return methods.map(toPaymentMethodResponse);
  }

  async findOne(id: number): Promise<PaymentMethodResponseDto> {
    const method = await this.paymentMethodRepository.findOneBy({ id });
    if (!method) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No existe el método de pago con id ${id} en el catálogo`,
      );
    }
    return toPaymentMethodResponse(method);
  }
}
