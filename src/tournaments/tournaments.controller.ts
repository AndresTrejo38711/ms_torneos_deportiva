import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { TournamentResponseDto } from './dto/tournament-response.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentsService } from './tournaments.service';

// HU-GC-01 · /api/deportiva/tournaments
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  create(@Body() dto: CreateTournamentDto): Promise<TournamentResponseDto> {
    return this.tournamentsService.create(dto);
  }

  @Get()
  findAll(): Promise<TournamentResponseDto[]> {
    return this.tournamentsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIdPipe) id: number,
  ): Promise<TournamentResponseDto> {
    return this.tournamentsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateTournamentDto,
  ): Promise<TournamentResponseDto> {
    return this.tournamentsService.update(id, dto);
  }

  @Patch(':id/disable')
  disable(
    @Param('id', ParseIdPipe) id: number,
  ): Promise<TournamentResponseDto> {
    return this.tournamentsService.disable(id);
  }

  @Patch(':id/enable')
  enable(@Param('id', ParseIdPipe) id: number): Promise<TournamentResponseDto> {
    return this.tournamentsService.enable(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.tournamentsService.remove(id);
  }
}
