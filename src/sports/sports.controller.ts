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
import { CreateSportDto } from './dto/create-sport.dto';
import { SportResponseDto } from './dto/sport-response.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { SportsService } from './sports.service';

// HU-GD-01 · /api/deportiva/sports
@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Post()
  create(@Body() dto: CreateSportDto): Promise<SportResponseDto> {
    return this.sportsService.create(dto);
  }

  @Get()
  findAll(): Promise<SportResponseDto[]> {
    return this.sportsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<SportResponseDto> {
    return this.sportsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateSportDto,
  ): Promise<SportResponseDto> {
    return this.sportsService.update(id, dto);
  }

  @Patch(':id/disable')
  disable(@Param('id', ParseIdPipe) id: number): Promise<SportResponseDto> {
    return this.sportsService.disable(id);
  }

  @Patch(':id/enable')
  enable(@Param('id', ParseIdPipe) id: number): Promise<SportResponseDto> {
    return this.sportsService.enable(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.sportsService.remove(id);
  }
}
