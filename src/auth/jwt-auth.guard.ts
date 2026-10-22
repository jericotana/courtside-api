// src/auth/jwt-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthUser } from './current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Public routes skip the check
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. Read "Authorization: Bearer <token>"
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    // 3. Verify signature + expiry
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      // 4. Remember who is calling, for @CurrentUser()
      request.user = { id: payload.sub };
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : undefined;
  }
}
