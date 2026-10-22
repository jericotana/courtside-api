import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { toPublicUser, type UserRow } from '../users/user';
import * as argon2 from 'argon2';
import type { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import {
  REFRESH_TOKEN_STORE,
  type RefreshTokenStore,
} from './refresh-tokens/refresh-token.store';
import { randomUUID } from 'crypto';
import type { AuthResult } from './auth';
import { generateToken, hashToken } from '../common/tokens';

@Injectable()
export class AuthService {
  private readonly dummyHash = argon2.hash('dummy-password-for-timing');

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshTokens: RefreshTokenStore,
  ) {}

  async signUp({ name, email, password }: SignUpDto): Promise<AuthResult> {
    const passwordHash = await argon2.hash(password);
    const user = await this.usersService.create({
      name: name,
      email: email,
      passwordHash,
      status: 'active',
      isSuperadmin: false,
    });

    return this.issueTokens(user);
  }

  async signIn({ email, password }: SignInDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(email);
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const valid = await argon2.verify(hash, password);

    if (!user || !user.passwordHash || user.status !== 'active' || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user);
  }

  async refresh(token: string | undefined): Promise<AuthResult> {
    if (!token) throw new UnauthorizedException();

    const hash = hashToken(token);
    const stored = await this.refreshTokens.find(hash);

    if (!stored) {
      throw new UnauthorizedException();
    }

    if (stored.revokedAt) {
      await this.refreshTokens.revokeFamily(stored.familyId);
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findById(stored.userId);

    if (!user || user.status !== 'active') {
      await this.refreshTokens.revoke(hash);
      throw new UnauthorizedException();
    }

    await this.refreshTokens.revoke(hash);

    return this.issueTokens(user, stored.familyId);
  }

  async signOut(token?: string): Promise<void> {
    if (token) {
      const hash = hashToken(token);
      const stored = await this.refreshTokens.find(hash);
      if (stored) {
        await this.refreshTokens.revokeFamily(stored.familyId);
      }
    }
  }

  private async issueTokens(
    user: UserRow,
    familyId?: string,
  ): Promise<AuthResult> {
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    const refreshToken = generateToken();
    familyId ??= randomUUID();
    const expiresAt = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.refreshTokens.save(hashToken(refreshToken), {
      userId: user.id,
      familyId,
      expiresAt,
      revokedAt: null,
    });

    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
