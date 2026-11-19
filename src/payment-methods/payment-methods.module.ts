import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsSeeder } from './payment-methods.seeder';
import { PaymentMethodsService } from './payment-methods.service';

// HU-GC-10 (catálogo). Se exporta el service para los métodos de cada aficionado.
@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethod])],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService, PaymentMethodsSeeder],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {}
