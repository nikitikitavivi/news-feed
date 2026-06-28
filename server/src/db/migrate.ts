import { db } from './client.js';

export async function ensureSchema(): Promise<void> {
  await db.execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'articles') THEN
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
    END;
    $$;
  `);

  await db.execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analyses') THEN
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
    END;
    $$;
  `);

  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_article_id ON analyses(article_id)`);

  console.log('[db] Schema ensured.');
}
