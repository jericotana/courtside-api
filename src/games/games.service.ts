import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Database, DRIZZLE, type Transaction } from '../db/db.module';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  gameEvents,
  gamePlayers,
  games,
  teamMembers,
  users,
} from '../db/schema';
import type {
  GameSummary,
  GameDetail,
  RecordEventsResult,
  GameListItem,
} from './game';
import { StartGameDto } from './dto/start-game.dto';
import { type RecordEventDto } from './dto/record-event.dto';

@Injectable()
export class GamesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async startGame(
    teamId: string,
    userId: string,
    dto: StartGameDto,
  ): Promise<GameDetail> {
    return this.db.transaction(async (tx) => {
      await this.assertOnTeam(tx, teamId, dto.playerIds);

      const [inserted] = await tx
        .insert(games)
        .values({
          id: dto.id,
          teamId,
          startedAt: dto.startedAt,
          createdBy: userId,
        })
        .onConflictDoNothing()
        .returning();

      if (!inserted) {
        const existing = await this.findGame(tx, teamId, dto.id);
        if (!existing) throw new ConflictException('Game id already in use');
        return existing;
      }

      await tx
        .insert(gamePlayers)
        .values(
          dto.playerIds.map((userId) => ({ gameId: inserted.id, userId })),
        );

      const game = await this.findGame(tx, teamId, dto.id);
      if (!game) throw new Error('Game missing right after insert');
      return game;
    });
  }

  async getGame(teamId: string, gameId: string): Promise<GameDetail> {
    const game = await this.findGame(this.db, teamId, gameId);
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  async endGame(
    teamId: string,
    gameId: string,
    endedAt: Date,
  ): Promise<GameDetail> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ startedAt: games.startedAt, endedAt: games.endedAt })
        .from(games)
        .where(and(eq(games.id, gameId), eq(games.teamId, teamId)));

      if (!existing) {
        throw new NotFoundException('Game not found');
      }

      if (!existing.endedAt) {
        if (endedAt < existing.startedAt) {
          throw new BadRequestException('endedAt must be after startedAt');
        }
        await tx
          .update(games)
          .set({ endedAt })
          .where(
            and(
              eq(games.id, gameId),
              eq(games.teamId, teamId),
              isNull(games.endedAt),
            ),
          );
      }

      const game = await this.findGame(tx, teamId, gameId);
      if (!game) throw new Error('Game not found');
      return game;
    });
  }

  async findGames(teamId: string): Promise<GameListItem[]> {
    return this.db
      .select({
        id: games.id,
        startedAt: games.startedAt,
        endedAt: games.endedAt,
        playerCount: sql<number>`(
        select count(*) from ${gamePlayers} gp
        where gp.game_id = "games"."id"
      )`.mapWith(Number),
        points: sql<number>`coalesce((
        select sum(case when e.type = 'make2' then 2 else 3 end)
        from ${gameEvents} e
        where e.game_id = "games"."id"
          and e.type in ('make2', 'make3')
          and not exists (
            select 1 from ${gameEvents} u
            where u.game_id = e.game_id and u.type = 'undo' and u.target_event_id = e.id
          )
      ), 0)`.mapWith(Number),
      })
      .from(games)
      .where(eq(games.teamId, teamId))
      .orderBy(desc(games.startedAt));
  }

  async recordEvents(
    teamId: string,
    gameId: string,
    events: RecordEventDto[],
  ): Promise<RecordEventsResult> {
    // Ended games still accept events: offline, "end" can sync before the last batch.
    return this.db.transaction(async (tx) => {
      if (events.some((e) => e.type === 'undo' && e.targetEventId === e.id)) {
        throw new BadRequestException(
          'Undo should not be able to target itself',
        );
      }
      const [existing] = await tx
        .select({ id: games.id })
        .from(games)
        .where(and(eq(games.id, gameId), eq(games.teamId, teamId)));

      if (!existing) {
        throw new NotFoundException('Game not found');
      }

      const playerIds = [
        ...new Set(
          events.filter((e) => e.type !== 'undo').map((e) => e.playerId!),
        ),
      ];

      if (playerIds.length !== 0) {
        const [{ total }] = await tx
          .select({ total: count() })
          .from(gamePlayers)
          .where(
            and(
              eq(gamePlayers.gameId, gameId),
              inArray(gamePlayers.userId, playerIds),
            ),
          );

        if (total !== playerIds.length) {
          throw new BadRequestException(
            'Every event must be for a player in this game',
          );
        }
      }

      const targets = events
        .filter((e) => e.type === 'undo')
        .map((e) => e.targetEventId!);

      const batchIds = new Set(events.map((e) => e.id));

      const toLookUp = [...new Set(targets.filter((t) => !batchIds.has(t)))];

      if (toLookUp.length > 0) {
        const [{ total }] = await tx
          .select({ total: count() })
          .from(gameEvents)
          .where(
            and(
              eq(gameEvents.gameId, gameId),
              inArray(gameEvents.id, toLookUp),
            ),
          );

        if (total !== toLookUp.length) {
          throw new BadRequestException('Undo target not found');
        }
      }

      const inserted = await tx
        .insert(gameEvents)
        .values(
          events.map((e) => ({
            id: e.id,
            gameId,
            type: e.type,
            at: e.at,
            playerId: e.type === 'undo' ? null : e.playerId,
            targetEventId: e.type === 'undo' ? e.targetEventId : null,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: gameEvents.id });

      return { received: events.length, inserted: inserted.length };
    });
  }

  async addPlayers(
    teamId: string,
    gameId: string,
    playerIds: string[],
  ): Promise<GameDetail> {
    // Ended games accept players too: offline, "end" can sync before this does.
    return this.db.transaction(async (tx) => {
      const [game] = await tx
        .select({ id: games.id })
        .from(games)
        .where(and(eq(games.id, gameId), eq(games.teamId, teamId)));
      if (!game) throw new NotFoundException('Game not found');

      await this.assertOnTeam(tx, teamId, playerIds);

      await tx
        .insert(gamePlayers)
        .values(playerIds.map((playerId) => ({ gameId, userId: playerId })))
        .onConflictDoNothing();

      const detail = await this.findGame(tx, teamId, gameId);
      if (!detail) throw new Error('Game missing right after insert');
      return detail;
    });
  }

  private async findGame(
    db: Database | Transaction,
    teamId: string,
    gameId: string,
  ): Promise<GameDetail | undefined> {
    // 1. the game, only if it belongs to this team
    const [game] = await db
      .select({
        id: games.id,
        startedAt: games.startedAt,
        endedAt: games.endedAt,
      })
      .from(games)
      .where(and(eq(games.id, gameId), eq(games.teamId, teamId)));

    if (!game) return undefined;

    // 2. who played, with their names
    const players = await db
      .select({ id: users.id, name: users.name })
      .from(gamePlayers)
      .innerJoin(users, eq(gamePlayers.userId, users.id))
      .where(eq(gamePlayers.gameId, gameId))
      .orderBy(users.name);

    // 3. the events, in court order (empty until B5b)
    const events = await db
      .select({
        id: gameEvents.id,
        playerId: gameEvents.playerId,
        type: gameEvents.type,
        targetEventId: gameEvents.targetEventId,
        at: gameEvents.at,
      })
      .from(gameEvents)
      .where(eq(gameEvents.gameId, gameId))
      .orderBy(gameEvents.at, gameEvents.id);

    return { ...game, players, events };
  }

  private async assertOnTeam(
    tx: Transaction,
    teamId: string,
    playerIds: string[],
  ): Promise<void> {
    const [{ total }] = await tx
      .select({ total: count() })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          inArray(teamMembers.userId, playerIds),
        ),
      );

    if (total !== playerIds.length) {
      throw new BadRequestException('All players must be on the team');
    }
  }
}
