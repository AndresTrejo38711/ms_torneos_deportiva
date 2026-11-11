import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

// HU-GD-04. Se exporta el service para los contratos con equipos (HU-GD-05) y, más adelante,
// para las habilidades (HU-GD-07) y el perfil deportivo (HU-GD-08).
@Module({
  imports: [TypeOrmModule.forFeature([Player])],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
