import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import type { Request, Response } from 'express';
import { AuthResponse } from './auth';
import { Public } from './public.decorator';
import { TurnstileService } from './turnstile.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly turnstile: TurnstileService,
  ) {}

  @Post('sign-up')
  @Public()
  async signUp(
    @Body() body: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    await this.turnstile.verify(body.turnstileToken);
    const { refreshToken, ...result } = await this.authService.signUp(body);
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('sign-in')
  @Public()
  @HttpCode(200)
  async signIn(
    @Body() body: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    await this.turnstile.verify(body.turnstileToken);
    const { refreshToken, ...result } = await this.authService.signIn(body);
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { refreshToken, ...result } = await this.authService.refresh(
      req.cookies.refresh_token,
    );
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('sign-out')
  @Public()
  @HttpCode(204)
  async signOut(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('refresh_token', { path: '/auth' });
    await this.authService.signOut(req.cookies.refresh_token);
    return;
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}
