import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { CurrentUser } from '../security/current-user.decorator';
import { BuyTicketsDto } from './dto/buy-tickets.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import {
  TicketPurchaseResponseDto,
  TicketResponseDto,
} from './dto/ticket-response.dto';
import { TicketsService } from './tickets.service';

// HU-GE-04 · /api/deportiva/tickets. Las del aficionado necesitan saber quién es (con
// SECURITY_ENABLED=false responden 401); la consulta por partido es del administrador. No hay DELETE:
// un boleto es historial.
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // Comprar: { "matchId": 12, "localityId": 4, "quantity": 2, "fanPaymentMethodId": 3 }
  @Post()
  buy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BuyTicketsDto,
  ): Promise<TicketPurchaseResponseDto> {
    return this.ticketsService.buy(user, dto);
  }

  // Confirmar el pago de una compra que quedó pendiente en la pasarela (ePayco), con la referencia
  // que esta le dio al aficionado: { "gatewayReference": "68fb83729d094878e015be00" }. 200: no crea
  // nada, responde la compra como quedó.
  @Post('payments/:reference/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reference') reference: string,
    @Body() dto: ConfirmPaymentDto,
  ): Promise<TicketPurchaseResponseDto> {
    return this.ticketsService.confirm(user, reference, dto);
  }

  // Los míos.
  @Get()
  findMine(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketResponseDto[]> {
    return this.ticketsService.findMine(user);
  }

  // Administrador: los boletos de un partido.
  @Get('matches/:matchId')
  findByMatch(
    @Param('matchId', ParseIdPipe) matchId: number,
  ): Promise<TicketResponseDto[]> {
    return this.ticketsService.findByMatch(matchId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<TicketResponseDto> {
    return this.ticketsService.findOne(user, id);
  }
}
