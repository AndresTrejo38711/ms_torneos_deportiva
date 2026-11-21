import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketPrice } from './entities/ticket-price.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketUsageService } from './ticket-usage.service';

// Lo que los partidos, las anotaciones, las localidades y los métodos de pago necesitan de los
// boletos (ver TicketUsageService). No importa ningún otro módulo, así que ellos lo pueden importar
// sin formar un ciclo con TicketsModule (que sí depende de partidos y métodos de pago).
@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketPrice])],
  providers: [TicketUsageService],
  exports: [TicketUsageService],
})
export class TicketUsageModule {}
