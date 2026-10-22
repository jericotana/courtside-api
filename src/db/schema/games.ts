import { teams } from './teams';
import { users } from './users';
import {
  pgTable,
  timestamp,
  pgEnum,
  uuid,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

export const eventType = pgEnum('event_type', [
  'make2',
  'miss2',
  'make3',
  'miss3',
  'rebound',
  'assist',
  'steal',
  'block',
  'undo',
]);
export type EventType = (typeof eventType.enumValues)[number];

export const games = pgTable(
  'games',
  {
    id: uuid().primaryKey(), // ← no defaultRandom(): the client sends it
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('games_team_id_started_at_idx').on(t.teamId, t.startedAt)],
);

export const gamePlayers = pgTable(
  'game_players',
  {
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.userId] })],
);

export const gameEvents = pgTable(
  'game_events',
  {
    id: uuid().primaryKey(), // ← from the client
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id').references(() => users.id, {
      onDelete: 'restrict',
    }), // null for 'undo'
    type: eventType().notNull(),
    targetEventId: uuid('target_event_id'), // only for 'undo'
    at: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('game_events_game_id_idx').on(t.gameId)],
);
