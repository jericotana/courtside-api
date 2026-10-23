import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { RequirePermission } from '../teams/require-permission.decorator';
import { CurrentMembership } from '../teams/current-membership.decorator';
import type { TeamMembership } from '../teams/team';
import { type AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { StartGameDto } from './dto/start-game.dto';
import type { GameDetail, RecordEventsResult, GameListItem } from './game';
import { EndGameDto } from './dto/end-game.dto';
import { RecordEventsDto } from './dto/record-event.dto';
import { AddPlayersDto } from './dto/add-players.dto';

@Controller('teams/:teamId/games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @RequirePermission('game:manage')
  async startGame(
    @CurrentMembership()
    membership: TeamMembership,
    @CurrentUser()
    user: AuthUser,
    @Body()
    body: StartGameDto,
  ): Promise<GameDetail> {
    return this.gamesService.startGame(membership.teamId, user.id, body);
  }

  @Get()
  @RequirePermission('team:view')
  async getGames(
    @CurrentMembership()
    membership: TeamMembership,
  ): Promise<GameListItem[]> {
    return this.gamesService.findGames(membership.teamId);
  }

  @Get(':gameId')
  @RequirePermission('team:view')
  async getGame(
    @CurrentMembership()
    membership: TeamMembership,
    @Param('gameId', ParseUUIDPipe)
    gameId: string,
  ): Promise<GameDetail> {
    return this.gamesService.getGame(membership.teamId, gameId);
  }

  @Post(':gameId/end')
  @RequirePermission('game:manage')
  @HttpCode(200)
  async endGame(
    @CurrentMembership()
    membership: TeamMembership,
    @Param('gameId', ParseUUIDPipe)
    gameId: string,
    @Body()
    body: EndGameDto,
  ): Promise<GameDetail> {
    return this.gamesService.endGame(membership.teamId, gameId, body.endedAt);
  }

  @Post(':gameId/events')
  @RequirePermission('game:record')
  @HttpCode(200)
  async recordEvents(
    @CurrentMembership()
    membership: TeamMembership,
    @Param('gameId', ParseUUIDPipe)
    gameId: string,
    @Body()
    body: RecordEventsDto,
  ): Promise<RecordEventsResult> {
    return this.gamesService.recordEvents(
      membership.teamId,
      gameId,
      body.events,
    );
  }

  @Post(':gameId/players')
  @RequirePermission('game:manage')
  @HttpCode(200)
  async addPlayers(
    @CurrentMembership() membership: TeamMembership,
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @Body() body: AddPlayersDto,
  ): Promise<GameDetail> {
    return this.gamesService.addPlayers(
      membership.teamId,
      gameId,
      body.playerIds,
    );
  }
}
