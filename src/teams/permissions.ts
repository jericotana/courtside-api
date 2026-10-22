import type { TeamRole } from '../db/schema';

export const PERMISSION_KEY = 'permission';

export const PERMISSIONS = [
  'team:view',
  'team:rename',
  'roster:manage',
  'game:manage', // start / end
  'game:record', // tap events
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<TeamRole, readonly Permission[]> = {
  admin: [...PERMISSIONS],
  player: ['team:view'],
};

export function hasPermission(role: TeamRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
