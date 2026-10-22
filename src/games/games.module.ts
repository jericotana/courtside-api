import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [TeamsModule],
  providers: [GamesService],
  controllers: [GamesController],
})
export class GamesModule {}
