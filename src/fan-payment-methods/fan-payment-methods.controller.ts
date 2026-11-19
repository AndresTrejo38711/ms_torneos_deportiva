import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { CurrentUser } from '../security/current-user.decorator';
import { CreateFanPaymentMethodDto } from './dto/create-fan-payment-method.dto';
import { FanPaymentMethodResponseDto } from './dto/fan-payment-method-response.dto';
import { UpdateFanPaymentMethodDto } from './dto/update-fan-payment-method.dto';
import { FanPaymentMethodsService } from './fan-payment-methods.service';

// HU-GC-10 · /api/deportiva/fan-payment-methods: los métodos de pago del aficionado que hace la
// petición. Necesitan saber quién es, así que con SECURITY_ENABLED=false responden 401.
@Controller('fan-payment-methods')
export class FanPaymentMethodsController {
  constructor(
    private readonly fanPaymentMethodsService: FanPaymentMethodsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFanPaymentMethodDto,
  ): Promise<FanPaymentMethodResponseDto> {
    return this.fanPaymentMethodsService.create(user, dto);
  }

  // Solo los míos.
  @Get()
  findMine(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FanPaymentMethodResponseDto[]> {
    return this.fanPaymentMethodsService.findMine(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<FanPaymentMethodResponseDto> {
    return this.fanPaymentMethodsService.findOne(user, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateFanPaymentMethodDto,
  ): Promise<FanPaymentMethodResponseDto> {
    return this.fanPaymentMethodsService.update(user, id, dto);
  }

  @Patch(':id/disable')
  disable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<FanPaymentMethodResponseDto> {
    return this.fanPaymentMethodsService.disable(user, id);
  }

  @Patch(':id/enable')
  enable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<FanPaymentMethodResponseDto> {
    return this.fanPaymentMethodsService.enable(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<void> {
    return this.fanPaymentMethodsService.remove(user, id);
  }
}
