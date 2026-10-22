import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { type Database, DRIZZLE } from './db/db.module';
import { sql } from 'drizzle-orm';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get('health')
  @Public()
  async getHealth() {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
    return { status: 'ok', database: 'ok' };
  }
}
