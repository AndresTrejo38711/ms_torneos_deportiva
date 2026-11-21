import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { CurrentUser } from '../security/current-user.decorator';
import { BuyTicketsDto } from './dto/buy-tickets.dto';
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
