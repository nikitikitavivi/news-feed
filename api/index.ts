import { ensureSchema } from '../server/src/db/migrate';
import app from '../server/src/index';

let migrated = false;

async function runMigrations() {
  if (migrated) return;
  try {
    await ensureSchema();
    migrated = true;
  } catch (err) {
    console.error('[api] Schema migration failed:', err);
  }
}

const migrationPromise = runMigrations();

export default async function handler(req: any, res: any) {
  await migrationPromise;
  return app(req, res);
}
