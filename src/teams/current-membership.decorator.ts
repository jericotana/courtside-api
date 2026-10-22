import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TeamMembership, TeamRequest } from './team';

export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TeamMembership => {
    const request = context.switchToHttp().getRequest<TeamRequest>();

    const membership = request.membership;
    if (!membership) {
      throw new Error(
        '@CurrentMembership is being used without setting membership first',
      );
    }

    return membership;
  },
);
