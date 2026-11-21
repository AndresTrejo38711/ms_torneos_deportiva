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
import { CreateLocalityDto } from './dto/create-locality.dto';
import { LocalityResponseDto } from './dto/locality-response.dto';
import { UpdateLocalityDto } from './dto/update-locality.dto';
import { LocalitiesService } from './localities.service';

// HU-GE-03 · /api/deportiva/localities
@Controller('localities')
export class LocalitiesController {
  constructor(private readonly localitiesService: LocalitiesService) {}

  @Post()
  create(@Body() dto: CreateLocalityDto): Promise<LocalityResponseDto> {
    return this.localitiesService.create(dto);
  }

  // Localidades de un escenario.
  @Get('venues/:venueId')
  findByVenue(
    @Param('venueId', ParseIdPipe) venueId: number,
  ): Promise<LocalityResponseDto[]> {
    return this.localitiesService.findByVenue(venueId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<LocalityResponseDto> {
    return this.localitiesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateLocalityDto,
  ): Promise<LocalityResponseDto> {
    return this.localitiesService.update(id, dto);
  }

  @Patch(':id/disable')
  disable(@Param('id', ParseIdPipe) id: number): Promise<LocalityResponseDto> {
    return this.localitiesService.disable(id);
  }

  @Patch(':id/enable')
  enable(@Param('id', ParseIdPipe) id: number): Promise<LocalityResponseDto> {
    return this.localitiesService.enable(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.localitiesService.remove(id);
  }
}
