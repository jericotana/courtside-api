import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import type { MyTeam, TeamMember, TeamMembership } from './team';
import { type AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission } from './require-permission.decorator';
import { CurrentMembership } from './current-membership.decorator';
import { UpdateTeamDto } from './dto/update-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateTeamMemberRoleDto } from './dto/update-team-member-role.dto';
import { InvitesService } from '../invites/invites.service';
import type { CreateInviteResult } from '../invites/invite';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly invitesService: InvitesService,
  ) {}

  @Post()
  async createTeam(
    @CurrentUser()
    user: AuthUser,
    @Body()
    body: CreateTeamDto,
  ): Promise<MyTeam> {
    return this.teamsService.create(user.id, body.name);
  }

  @Get()
  async getUserTeams(@CurrentUser() user: AuthUser): Promise<MyTeam[]> {
    return this.teamsService.findTeamsByUserId(user.id);
  }

  @Get(':teamId')
  @RequirePermission('team:view')
  async getTeam(
    @CurrentMembership() membership: TeamMembership,
  ): Promise<MyTeam> {
    const team = await this.teamsService.findById(membership.teamId);
    if (!team) throw new NotFoundException('Team not found');
    return { ...team, role: membership.role };
  }

  @Patch(':teamId')
  @RequirePermission('team:rename')
  async renameTeam(
    @CurrentMembership() membership: TeamMembership,
    @Body() body: UpdateTeamDto,
  ): Promise<MyTeam> {
    const team = await this.teamsService.rename(membership.teamId, body.name);
    return { ...team, role: membership.role };
  }

  @Get(':teamId/members')
  @RequirePermission('team:view')
  async getTeamMembers(
    @CurrentMembership() membership: TeamMembership,
  ): Promise<TeamMember[]> {
    return this.teamsService.findTeamMembers(membership.teamId);
  }

  @Post(':teamId/members')
  @RequirePermission('roster:manage')
  async inviteTeamMember(
    @CurrentMembership() membership: TeamMembership,
    @Body() body: InviteMemberDto,
  ): Promise<TeamMember> {
    return this.teamsService.inviteMember(membership.teamId, body.name);
  }

  @Patch(':teamId/members/:userId')
  @RequirePermission('roster:manage')
  async updateTeamMemberRole(
    @CurrentMembership() membership: TeamMembership,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateTeamMemberRoleDto,
  ): Promise<TeamMember> {
    return this.teamsService.updateTeamMemberRole(
      membership.teamId,
      userId,
      body.role,
    );
  }

  @Delete(':teamId/members/:userId')
  @RequirePermission('roster:manage')
  @HttpCode(204)
  async deleteMember(
    @CurrentMembership() membership: TeamMembership,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.teamsService.removeMember(membership.teamId, userId);
  }

  @Post(':teamId/leave')
  @RequirePermission('team:view')
  @HttpCode(204)
  async leaveTeam(
    @CurrentMembership() membership: TeamMembership,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.teamsService.removeMember(membership.teamId, user.id);
  }

  @Post(':teamId/members/:userId/invite')
  @RequirePermission('roster:manage')
  async createInvite(
    @CurrentMembership() membership: TeamMembership,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateInviteResult> {
    return this.invitesService.create(membership.teamId, userId, user.id);
  }
}
