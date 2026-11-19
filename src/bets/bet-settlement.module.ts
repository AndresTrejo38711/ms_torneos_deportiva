import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetSettlementService } from './bet-settlement.service';
import { BetUsageService } from './bet-usage.service';
import { Bet } from './entities/bet.entity';

// Lo que los partidos, las anotaciones y los métodos de pago necesitan de las apuestas: liquidarlas,
// anularlas, contarlas y saber a quién escribirle. No importa ningún otro módulo, así que ellos lo
// pueden importar sin formar un ciclo con BetsModule (que sí depende de partidos y métodos de pago).
@Module({
  imports: [TypeOrmModule.forFeature([Bet])],
  providers: [BetSettlementService, BetUsageService],
  exports: [BetSettlementService, BetUsageService],
})
export class BetSettlementModule {}
