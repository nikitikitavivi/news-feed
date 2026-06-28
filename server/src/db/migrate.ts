import { fileURLToPath } from 'url';
import { sql } from 'drizzle-orm';
import { db } from './client.js';

export async function ensureSchema(): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'articles')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'articles') THEN
        DROP TYPE articles CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'articles') THEN
        CREATE TABLE articles (
          id SERIAL PRIMARY KEY,
          url TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          source TEXT NOT NULL,
          image_url TEXT,
          published_at TIMESTAMPTZ NOT NULL,
          snippet TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      END IF;

      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analyses')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analyses') THEN
        DROP TYPE analyses CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analyses') THEN
        CREATE TABLE analyses (
          id SERIAL PRIMARY KEY,
          article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
          summary TEXT NOT NULL,
          sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
          rationale TEXT,
          model TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_analyses_article_id') THEN
        CREATE UNIQUE INDEX idx_analyses_article_id ON analyses(article_id);
      END IF;
    END;
    $$;
  `);

  console.log('[db] Schema ensured.');
}

const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  ensureSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] Migration failed:', err);
      process.exit(1);
    });
}
