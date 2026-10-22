import type { AuthUser } from '../auth/current-user.decorator';
import type { TeamRole, UserStatus } from '../db/schema';
import type { Request } from 'express';

export type Team = {
  id: string;
  name: string;
};

export type MyTeam = {
  id: string;
  name: string;
  role: TeamRole;
};

export type TeamMember = {
  userId: string;
  name: string;
  role: TeamRole;
  status: UserStatus;
  joinedAt: Date;
};

export type TeamMembership = {
  teamId: string;
  role: TeamRole;
};

export type TeamRequest = Request & {
  user?: AuthUser;
  membership?: TeamMembership;
};
