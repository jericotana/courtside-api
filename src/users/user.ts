import { users } from '../db/schema';

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PublicUser = Pick<UserRow, 'id' | 'name' | 'email'>;

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
  };
}
