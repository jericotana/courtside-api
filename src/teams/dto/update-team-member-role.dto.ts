import { IsIn } from 'class-validator';
import { teamRole, type TeamRole } from '../../db/schema';

export class UpdateTeamMemberRoleDto {
  @IsIn(teamRole.enumValues)
  role: TeamRole;
}
