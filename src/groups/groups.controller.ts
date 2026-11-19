import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';

// HU-GC-04 · /api/deportiva/groups
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Body() dto: CreateGroupDto): Promise<GroupResponseDto> {
    return this.groupsService.create(dto);
  }

  // Grupos de una fase, cada uno con sus equipos.
  @Get('phases/:phaseId')
  findByPhase(
    @Param('phaseId', ParseIdPipe) phaseId: number,
  ): Promise<GroupResponseDto[]> {
    return this.groupsService.findByPhase(phaseId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<GroupResponseDto> {
    return this.groupsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.groupsService.remove(id);
  }
}
