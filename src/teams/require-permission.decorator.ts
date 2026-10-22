import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { type Permission, PERMISSION_KEY } from './permissions';
import { TeamPermissionGuard } from './team-permission.guard';

export const RequirePermission = (permission: Permission) =>
  applyDecorators(
    SetMetadata(PERMISSION_KEY, permission),
    UseGuards(TeamPermissionGuard),
  );
