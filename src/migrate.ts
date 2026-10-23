import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
  });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
    console.log('Migrations applied');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1); // non-zero → Railway stops the deploy
});
