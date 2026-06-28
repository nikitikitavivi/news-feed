import { env } from '../config.js';

const useNeon = !!process.env.VERCEL || !!process.env.NEON;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

if (useNeon) {
  const { neon } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-http');
  db = drizzle(neon(env.DATABASE_URL));
} else {
  const pg = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  db = drizzle(new pg.Pool({ connectionString: env.DATABASE_URL }));
}

export { db };
