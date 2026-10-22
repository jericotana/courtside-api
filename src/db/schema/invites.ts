import { teams } from './teams';
import { users } from './users';
import { pgTable, timestamp, text, uuid } from 'drizzle-orm/pg-core';

export const invites = pgTable('invites', {
  id: uuid().primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  invitedUserId: uuid('invited_user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
