import { db } from './client.js';

async function safeExecute(sql: string, label: string): Promise<void> {
  try {
    await db.execute(sql);
  } catch (err: any) {
    if (
      err.code === '23505' || // duplicate (e.g. leftover composite type)
      err.message?.includes('already exists')
    ) {
      console.log(`[db] Skipped ${label} (already exists)`);
      return;
    }
    console.error(`[db] Failed ${label}:`, err.message);
  }
}

export async function ensureSchema(): Promise<void> {
  await safeExecute(
    `CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      image_url TEXT,
      published_at TIMESTAMPTZ NOT NULL,
      snippet TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    'articles table'
  );

  await safeExecute(
    `CREATE TABLE IF NOT EXISTS analyses (
      id SERIAL PRIMARY KEY,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
      rationale TEXT,
      model TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    'analyses table'
  );

  await safeExecute(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_article_id ON analyses(article_id)`,
    'analyses index'
  );

  console.log('[db] Schema ensured.');
}
