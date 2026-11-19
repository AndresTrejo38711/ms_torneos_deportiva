import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { CurrentUser } from '../security/current-user.decorator';
import { BetsService } from './bets.service';
import { CreateBetDto, UpdateBetDto } from './dto/bet-fields.dto';
import { BetResponseDto } from './dto/bet-response.dto';

// HU-GC-11 · /api/deportiva/bets. Las del aficionado necesitan saber quién es (con
// SECURITY_ENABLED=false responden 401); la consulta por partido es del administrador. No hay DELETE:
// una apuesta es historial, se cancela.
@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBetDto,
  ): Promise<BetResponseDto> {
    return this.betsService.create(user, dto);
  }

  // Las mías.
  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<BetResponseDto[]> {
    return this.betsService.findMine(user);
  }

  // Administrador: las apuestas de un partido.
  @Get('matches/:matchId')
  findByMatch(
    @Param('matchId', ParseIdPipe) matchId: number,
  ): Promise<BetResponseDto[]> {
    return this.betsService.findByMatch(matchId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<BetResponseDto> {
    return this.betsService.findOne(user, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateBetDto,
  ): Promise<BetResponseDto> {
    return this.betsService.update(user, id, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<BetResponseDto> {
    return this.betsService.cancel(user, id);
  }
}
