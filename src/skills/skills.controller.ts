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
import { CreateSkillDto } from './dto/create-skill.dto';
import { SkillResponseDto } from './dto/skill-response.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { SkillsService } from './skills.service';

// HU-GD-06 · /api/deportiva/skills
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  create(@Body() dto: CreateSkillDto): Promise<SkillResponseDto> {
    return this.skillsService.create(dto);
  }

  @Get()
  findAll(): Promise<SkillResponseDto[]> {
    return this.skillsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<SkillResponseDto> {
    return this.skillsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateSkillDto,
  ): Promise<SkillResponseDto> {
    return this.skillsService.update(id, dto);
  }

  @Patch(':id/disable')
  disable(@Param('id', ParseIdPipe) id: number): Promise<SkillResponseDto> {
    return this.skillsService.disable(id);
  }

  @Patch(':id/enable')
  enable(@Param('id', ParseIdPipe) id: number): Promise<SkillResponseDto> {
    return this.skillsService.enable(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.skillsService.remove(id);
  }
}
