import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenuesModule } from '../venues/venues.module';
import { Locality } from './entities/locality.entity';
import { LocalitiesController } from './localities.controller';
import { LocalitiesService } from './localities.service';

// Localidades de los escenarios (HU-GE-03). Importa VenuesModule para validar el escenario.
@Module({
  imports: [TypeOrmModule.forFeature([Locality]), VenuesModule],
  controllers: [LocalitiesController],
  providers: [LocalitiesService],
})
export class LocalitiesModule {}
