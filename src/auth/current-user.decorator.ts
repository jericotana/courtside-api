import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type AuthUser = { id: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();
    return request.user;
  },
);
