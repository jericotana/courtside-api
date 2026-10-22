import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamsService } from './teams.service';
import { hasPermission, type Permission, PERMISSION_KEY } from './permissions';
import { isUUID } from 'class-validator';
import { type TeamRequest } from './team';

@Injectable()
export class TeamPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamsService: TeamsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TeamRequest>();
    const teamId = request.params.teamId as string;
    const userId = request.user?.id;

    if (!userId) throw new UnauthorizedException();
    if (!teamId)
      throw new Error('@RequirePermission used on a route without :teamId');
    if (!isUUID(teamId)) {
      throw new NotFoundException('Team not found');
    }

    const membership = await this.teamsService.findMembership(teamId, userId);

    if (!membership) {
      throw new NotFoundException('Team not found');
    }

    if (!hasPermission(membership.role, permission)) {
      throw new ForbiddenException("You don't have permission to do this");
    }

    request.membership = membership;

    return true;
  }
}
