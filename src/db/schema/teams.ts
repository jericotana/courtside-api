import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const teamRole = pgEnum('team_role', ['admin', 'player']);
export type TeamRole = (typeof teamRole.enumValues)[number];

export const teams = pgTable('teams', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 50 }).notNull(),
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamMembers = pgTable(
  'team_members',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: teamRole().notNull().default('player'),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.userId] }),
    index('team_members_user_id_idx').on(t.userId),
  ],
);
