import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fan } from './entities/fan.entity';
import { FansService } from './fans.service';

// Aficionados (HU-GC-10 y HU-GC-11). Sin controller: el aficionado no se registra aquí sino en
// ms_torneos_security. Se exporta el service para lo que cada aficionado gestiona sobre sí mismo.
@Module({
  imports: [TypeOrmModule.forFeature([Fan])],
  providers: [FansService],
  exports: [FansService],
})
export class FansModule {}
