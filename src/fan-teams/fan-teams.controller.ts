import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/validation/parse-id.pipe';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { CurrentUser } from '../security/current-user.decorator';
import { CreateFanTeamsDto } from './dto/create-fan-teams.dto';
import {
  AvailableTeamDto,
  FollowedTeamDto,
  TeamFollowerDto,
} from './dto/fan-team-response.dto';
import { FanTeamsService } from './fan-teams.service';

// HU-GE-05 · /api/deportiva/fan-teams. Las del aficionado necesitan saber quién es (con
// SECURITY_ENABLED=false responden 401); la de los aficionados de un equipo es del administrador.
@Controller('fan-teams')
export class FanTeamsController {
  constructor(private readonly fanTeamsService: FanTeamsService) {}

  // Seguir uno o varios equipos: { "teamIds": [3, 8] }
  @Post()
  follow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFanTeamsDto,
  ): Promise<FollowedTeamDto[]> {
    return this.fanTeamsService.follow(user, dto);
  }

  // Los que sigo.
  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<FollowedTeamDto[]> {
    return this.fanTeamsService.findMine(user);
  }

  // Los que puedo seguir.
  @Get('teams')
  findAvailable(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AvailableTeamDto[]> {
    return this.fanTeamsService.findAvailable(user);
  }

  // Administrador: los aficionados que siguen a un equipo.
  @Get('teams/:teamId/fans')
  findFollowers(
    @Param('teamId', ParseIdPipe) teamId: number,
  ): Promise<TeamFollowerDto[]> {
    return this.fanTeamsService.findFollowers(teamId);
  }

  // Dejar de seguir un equipo.
  @Delete(':teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', ParseIdPipe) teamId: number,
  ): Promise<void> {
    return this.fanTeamsService.unfollow(user, teamId);
  }
}
