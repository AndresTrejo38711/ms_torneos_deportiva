import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import { GroupResponseDto } from '../groups/dto/group-response.dto';
import { CreateGroupTeamsDto } from './dto/create-group-teams.dto';
import { GroupTeamsService } from './group-teams.service';

// HU-GC-04 · /api/deportiva/group-teams. Para consultar los equipos de un grupo: GET /groups/{id}
// o GET /groups/phases/{phaseId} (cada grupo trae sus equipos).
@Controller('group-teams')
export class GroupTeamsController {
  constructor(private readonly groupTeamsService: GroupTeamsService) {}

  // Asignar uno o varios equipos: { "groupId": 1, "teamIds": [3, 5, 8] }
  @Post()
  create(@Body() dto: CreateGroupTeamsDto): Promise<GroupResponseDto> {
    return this.groupTeamsService.create(dto);
  }

  // Sacar un equipo del grupo (el equipo y el grupo no se eliminan).
  @Delete(':groupId/:teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('groupId', ParseIdPipe) groupId: number,
    @Param('teamId', ParseIdPipe) teamId: number,
  ): Promise<void> {
    return this.groupTeamsService.remove(groupId, teamId);
  }
}
