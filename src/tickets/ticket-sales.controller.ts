import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { MatchTicketingDto } from './dto/match-ticketing.dto';
import {
  MatchTicketingResponseDto,
  TicketSaleMatchDto,
} from './dto/ticket-response.dto';
import { TicketSalesService } from './ticket-sales.service';

// HU-GE-04 · /api/deportiva/matches/{id}/ticketing: la venta de entradas de un partido (la configura
// el administrador). Va junto a las cuotas del partido (/matches/{id}/betting).
@Controller('matches')
export class MatchTicketingController {
  constructor(private readonly sales: TicketSalesService) {}

  @Get(':id/ticketing')
  findOne(
    @Param('id', ParseIdPipe) id: number,
  ): Promise<MatchTicketingResponseDto> {
    return this.sales.findOne(id);
  }

  // Fija los precios por localidad y abre o cierra la venta.
  @Put(':id/ticketing')
  configure(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: MatchTicketingDto,
  ): Promise<MatchTicketingResponseDto> {
    return this.sales.configure(id, dto);
  }
}

// HU-GE-04 · /api/deportiva/ticketing/matches: los partidos que hoy venden boletos (para el
// aficionado). Va en otra ruta y no en /tickets/... para que su permiso no se cruce con el de ver un
// boleto (/tickets/{id}), como /betting/matches en las apuestas.
@Controller('ticketing')
export class TicketingMatchesController {
  constructor(private readonly sales: TicketSalesService) {}

  @Get('matches')
  availableMatches(): Promise<TicketSaleMatchDto[]> {
    return this.sales.availableMatches();
  }
}
