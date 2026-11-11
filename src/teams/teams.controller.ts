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
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

// HU-GD-02 · /api/deportiva/teams
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Body() dto: CreateTeamDto): Promise<TeamResponseDto> {
    return this.teamsService.create(dto);
  }

  @Get()
  findAll(): Promise<TeamResponseDto[]> {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<TeamResponseDto> {
    return this.teamsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamsService.update(id, dto);
  }

  @Patch(':id/disable')
  disable(@Param('id', ParseIdPipe) id: number): Promise<TeamResponseDto> {
    return this.teamsService.disable(id);
  }

  @Patch(':id/enable')
  enable(@Param('id', ParseIdPipe) id: number): Promise<TeamResponseDto> {
    return this.teamsService.enable(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.teamsService.remove(id);
  }
}
