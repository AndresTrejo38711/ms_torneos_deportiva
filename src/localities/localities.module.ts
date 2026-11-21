import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketUsageModule } from '../tickets/ticket-usage.module';
import { VenuesModule } from '../venues/venues.module';
import { Locality } from './entities/locality.entity';
import { LocalitiesController } from './localities.controller';
import { LocalitiesService } from './localities.service';

// Localidades de los escenarios (HU-GE-03). Importa VenuesModule para validar el escenario y
// TicketUsageModule (que no depende de nadie) para no eliminar una localidad con boletos o precios.
@Module({
  imports: [
    TypeOrmModule.forFeature([Locality]),
    VenuesModule,
    TicketUsageModule,
  ],
  controllers: [LocalitiesController],
  providers: [LocalitiesService],
})
export class LocalitiesModule {}
