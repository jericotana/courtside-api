import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', ['invited', 'active']);
export type UserStatus = (typeof userStatus.enumValues)[number];

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 50 }).notNull(),
  email: varchar({ length: 254 }).unique(),
  passwordHash: text('password_hash'),
  status: userStatus().notNull().default('active'),
  isSuperadmin: boolean('is_superadmin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
