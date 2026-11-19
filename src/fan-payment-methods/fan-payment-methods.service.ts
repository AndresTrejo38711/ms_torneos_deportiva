import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetUsageService } from '../bets/bet-usage.service';
import { ApplicationException } from '../common/errors/application.exception';
import { ErrorCase } from '../common/errors/error-case.enum';
import { Fan } from '../fans/entities/fan.entity';
import { FansService } from '../fans/fans.service';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import { AuthenticatedUser } from '../security/authenticated-user';
import { CreateFanPaymentMethodDto } from './dto/create-fan-payment-method.dto';
import { FanPaymentMethodResponseDto } from './dto/fan-payment-method-response.dto';
import { UpdateFanPaymentMethodDto } from './dto/update-fan-payment-method.dto';
import { FanPaymentMethod } from './entities/fan-payment-method.entity';
import { toFanPaymentMethodResponse } from './fan-payment-methods.mapper';
import {
  expiryLabel,
  isExpired,
  PaymentData,
  paymentDataFor,
  sameMethod,
} from './payment-data.rules';

// HU-GC-10 · Métodos de pago del aficionado. Cada operación es sobre el aficionado que hace la
// petición (sale del token, nunca del cuerpo): el método de otro aficionado responde 404, como si no
// existiera, así no se revela que existe (criterio 8).
@Injectable()
export class FanPaymentMethodsService {
  constructor(
    @InjectRepository(FanPaymentMethod)
    private readonly methodRepository: Repository<FanPaymentMethod>,
    private readonly fansService: FansService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly betUsage: BetUsageService,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateFanPaymentMethodDto,
  ): Promise<FanPaymentMethodResponseDto> {
    const fan = await this.fansService.resolve(user);
    const catalog = await this.paymentMethodsService.findOne(
      dto.paymentMethodId,
    );
    const data = paymentDataFor(catalog.kind, dto);
    ensureNotExpired(data, 'registra una vigente');
    await this.ensureNotRegistered(fan, catalog.id, data);

    const saved = await this.methodRepository.save(
      this.methodRepository.create({
        fan: { id: fan.id },
        paymentMethod: { id: catalog.id },
        alias: dto.alias ?? null,
        ...data,
      }),
    );
    return toFanPaymentMethodResponse(await this.findOwn(fan, saved.id));
  }

  // Los del aficionado, del más antiguo al más reciente (activos y desactivados).
  async findMine(
    user: AuthenticatedUser,
  ): Promise<FanPaymentMethodResponseDto[]> {
    const fan = await this.fansService.resolve(user);
    const methods = await this.methodRepository.find({
      where: { fan: { id: fan.id } },
      relations: { paymentMethod: true },
      order: { id: 'ASC' },
    });
    return methods.map(toFanPaymentMethodResponse);
  }

  async findOne(
    user: AuthenticatedUser,
    id: number,
  ): Promise<FanPaymentMethodResponseDto> {
    const fan = await this.fansService.resolve(user);
    return toFanPaymentMethodResponse(await this.findOwn(fan, id));
  }

  // Solo si está activo. El tipo del catálogo no cambia.
  async update(
    user: AuthenticatedUser,
    id: number,
    dto: UpdateFanPaymentMethodDto,
  ): Promise<FanPaymentMethodResponseDto> {
    const fan = await this.fansService.resolve(user);
    const method = await this.findOwn(fan, id);
    if (!method.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `${describe(method)} está desactivado: actívalo antes de editarlo`,
      );
    }
    const data = paymentDataFor(method.paymentMethod.kind, dto);
    ensureNotExpired(data, 'registra una vigente');
    await this.ensureNotRegistered(fan, method.paymentMethod.id, data, id);

    await this.methodRepository.update(id, {
      alias: dto.alias ?? null,
      ...data,
    });
    return toFanPaymentMethodResponse(await this.findOwn(fan, id));
  }

  // Desactivado no se puede usar para pagar, pero conserva sus operaciones.
  async disable(
    user: AuthenticatedUser,
    id: number,
  ): Promise<FanPaymentMethodResponseDto> {
    const fan = await this.fansService.resolve(user);
    const method = await this.findOwn(fan, id);
    if (!method.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `${describe(method)} ya está desactivado`,
      );
    }
    await this.methodRepository.update(id, { active: false });
    return toFanPaymentMethodResponse(await this.findOwn(fan, id));
  }

  // Una tarjeta vencida no se vuelve a activar.
  async enable(
    user: AuthenticatedUser,
    id: number,
  ): Promise<FanPaymentMethodResponseDto> {
    const fan = await this.fansService.resolve(user);
    const method = await this.findOwn(fan, id);
    if (method.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `${describe(method)} ya está activo`,
      );
    }
    ensureNotExpired(method, 'no se puede activar');
    await this.methodRepository.update(id, { active: true });
    return toFanPaymentMethodResponse(await this.findOwn(fan, id));
  }

  // Con apuestas hechas (HU-GC-11) solo se puede desactivar: eliminarlo borraría la relación con esas
  // operaciones (criterio 9).
  async remove(user: AuthenticatedUser, id: number): Promise<void> {
    const fan = await this.fansService.resolve(user);
    const method = await this.findOwn(fan, id);
    const bets = await this.betUsage.countForPaymentMethod(id);
    if (bets > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `${describe(method)} tiene apuestas (${bets}): no se puede eliminar, desactívalo en su lugar para conservarlas`,
      );
    }
    await this.methodRepository.delete(id);
  }

  // HU-GC-11: el método con que el aficionado quiere pagar. Debe ser suyo (si no, 404 como si no
  // existiera), estar activo y, si es tarjeta, no estar vencida.
  async findUsable(fan: Fan, id: number): Promise<FanPaymentMethod> {
    const method = await this.findOwn(fan, id);
    if (!method.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `${describe(method)} está desactivado: actívalo o elige otro método de pago`,
      );
    }
    ensureNotExpired(method, 'elige otro método de pago');
    return method;
  }

  // ---------------------------------------------------------------------------------------------

  private async findOwn(fan: Fan, id: number): Promise<FanPaymentMethod> {
    const method = await this.methodRepository.findOne({
      where: { id, fan: { id: fan.id } },
      relations: { paymentMethod: true },
    });
    if (!method) {
      throw new ApplicationException(
        ErrorCase.NOT_FOUND,
        `No tienes un método de pago con id ${id}`,
      );
    }
    return method;
  }

  // El aficionado no registra dos veces la misma tarjeta, cuenta o billetera. excludeId es el método
  // que se está editando.
  private async ensureNotRegistered(
    fan: Fan,
    paymentMethodId: number,
    data: PaymentData,
    excludeId?: number,
  ): Promise<void> {
    const sameType = await this.methodRepository.find({
      where: { fan: { id: fan.id }, paymentMethod: { id: paymentMethodId } },
      relations: { paymentMethod: true },
    });
    const existing = sameType.find(
      (method) => method.id !== excludeId && sameMethod(method, data),
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya registraste ese método de pago: ${describe(existing)}`,
      );
    }
  }
}

function ensureNotExpired(data: PaymentData, action: string): void {
  if (isExpired(data)) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `La tarjeta venció en ${expiryLabel(data)}: ${action}`,
    );
  }
}

// Cómo se nombra un método en los mensajes: su alias o su tipo con lo que lo identifica.
function describe(method: FanPaymentMethod): string {
  if (method.alias) {
    return `"${method.alias}"`;
  }
  const detail = method.lastFour
    ? ` terminado en ${method.lastFour}`
    : method.phone
      ? ` del celular ${method.phone}`
      : '';
  return `"${method.paymentMethod.name}${detail}"`;
}
