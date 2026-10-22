import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { type AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { PublicUser, toPublicUser } from './user';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    const row = await this.usersService.findById(user.id);
    if (!row) {
      throw new UnauthorizedException();
    }
    return toPublicUser(row);
  }
}
