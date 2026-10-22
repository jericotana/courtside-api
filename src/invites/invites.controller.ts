import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { Public } from '../auth/public.decorator';
import type { PreviewInviteResult } from './invite';
import { type AuthUser, CurrentUser } from '../auth/current-user.decorator';
import type { MyTeam } from '../teams/team';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Public()
  @Get(':token')
  async preview(@Param('token') token: string): Promise<PreviewInviteResult> {
    return this.invitesService.preview(token);
  }

  @Post(':token/accept')
  @HttpCode(200)
  async accept(
    @Param('token') token: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MyTeam> {
    return this.invitesService.accept(token, user.id);
  }
}
