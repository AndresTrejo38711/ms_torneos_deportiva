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
  Query,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayerResponseDto } from './dto/player-response.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayersService } from './players.service';

// HU-GD-04 · /api/deportiva/players
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post()
  create(@Body() dto: CreatePlayerDto): Promise<PlayerResponseDto> {
    return this.playersService.create(dto);
  }

  // GET /players lista todos; GET /players?search=perez busca por nombre o documento (HU-GD-08).
  @Get()
  findAll(@Query('search') search?: unknown): Promise<PlayerResponseDto[]> {
    // ?search=a&search=b llega como lista: en ese caso se ignora.
    return this.playersService.findAll(
      typeof search === 'string' ? search : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<PlayerResponseDto> {
    return this.playersService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdatePlayerDto,
  ): Promise<PlayerResponseDto> {
    return this.playersService.update(id, dto);
  }

  @Patch(':id/disable')
  disable(@Param('id', ParseIdPipe) id: number): Promise<PlayerResponseDto> {
    return this.playersService.disable(id);
  }

  @Patch(':id/enable')
  enable(@Param('id', ParseIdPipe) id: number): Promise<PlayerResponseDto> {
    return this.playersService.enable(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.playersService.remove(id);
  }
}
