import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sport } from './entities/sport.entity';
import { SportsController } from './sports.controller';
import { SportsService } from './sports.service';

// Agrupa todo lo del recurso "deportes". forFeature registra la entidad (crea la tabla y permite
// inyectar su repository). Se exporta el service para que otros módulos, como equipos (HU-GD-03),
// puedan buscar deportes.
@Module({
  imports: [TypeOrmModule.forFeature([Sport])],
  controllers: [SportsController],
  providers: [SportsService],
  exports: [SportsService],
})
export class SportsModule {}
