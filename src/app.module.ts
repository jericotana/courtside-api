import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DbModule } from './db/db.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TeamsModule } from './teams/teams.module';
import { InvitesModule } from './invites/invites.module';
import { GamesModule } from './games/games.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DbModule,
    UsersModule,
    AuthModule,
    TeamsModule,
    InvitesModule,
    GamesModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
