import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { type Database, DRIZZLE } from '../db/db.module';
import { NewUser, UserRow } from './user';
import { users } from '../db/schema';
import { isUniqueViolation } from '../db/pg-errors';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(user: NewUser): Promise<UserRow> {
    try {
      const [row] = await this.db.insert(users).values(user).returning();

      return row;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Email ${user.email} is already in use`);
      }

      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return row;
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));
    return row;
  }
}
