import { Controller, Get } from '@nestjs/common';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';
import { PaymentMethodsService } from './payment-methods.service';

// HU-GC-10 · /api/deportiva/payment-methods (catálogo; se siembra al arrancar, no se edita).
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  findAll(): Promise<PaymentMethodResponseDto[]> {
    return this.paymentMethodsService.findAll();
  }
}
