import { eq, and, or, desc, count, ilike } from 'drizzle-orm';
import { db } from './db/client.js';
import { articles, analyses } from './db/schema.js';

export interface ArticleRow {
  id: number;
  url: string;
  title: string;
  source: string;
  imageUrl: string | null;
  publishedAt: string;
  snippet: string | null;
  createdAt: string;
}

export interface AnalysisRow {
  id: number;
  articleId: number;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  rationale: string;
  model: string;
  createdAt: string;
}

function toArticleRow(row: typeof articles.$inferSelect): ArticleRow {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    source: row.source,
    imageUrl: row.imageUrl,
    publishedAt: row.publishedAt.toISOString(),
    snippet: row.snippet,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function upsertArticle(input: {
  url: string;
  title: string;
  source: string;
  imageUrl: string | null;
  publishedAt: string;
  snippet: string | null;
}): Promise<ArticleRow> {
  const [inserted] = await db
    .insert(articles)
    .values({
      url: input.url,
      title: input.title,
      source: input.source,
      imageUrl: input.imageUrl,
      publishedAt: new Date(input.publishedAt),
      snippet: input.snippet,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) return toArticleRow(inserted);

  const [existing] = await db
    .select()
    .from(articles)
    .where(eq(articles.url, input.url))
    .limit(1);

  return toArticleRow(existing!);
}

export async function getAnalysisByArticleId(
  articleId: number
): Promise<AnalysisRow | null> {
  const rows = await db
    .select()
    .from(analyses)
    .where(eq(analyses.articleId, articleId))
    .limit(1);

  if (rows.length === 0) return null;

  return toAnalysisRow(rows[0]);
}

function toAnalysisRow(row: typeof analyses.$inferSelect): AnalysisRow {
  return {
    id: row.id,
    articleId: row.articleId,
    summary: row.summary,
    sentiment: row.sentiment as 'positive' | 'neutral' | 'negative',
    rationale: row.rationale ?? '',
    model: row.model,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createAnalysis(
  article: { id: number },
  data: {
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    rationale: string;
    model: string;
  }
): Promise<{ analysis: AnalysisRow; created: boolean }> {
  const [inserted] = await db
    .insert(analyses)
    .values({
      articleId: article.id,
      summary: data.summary,
      sentiment: data.sentiment,
      rationale: data.rationale,
      model: data.model,
    })
    .onConflictDoNothing({ target: analyses.articleId })
    .returning();

  if (inserted) return { analysis: toAnalysisRow(inserted), created: true };

  const [existing] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.articleId, article.id))
    .limit(1);

  return { analysis: toAnalysisRow(existing!), created: false };
}

export async function getAnalyses(filters: {
  sentiment?: 'positive' | 'neutral' | 'negative';
  q?: string;
  limit: number;
  offset: number;
}): Promise<{
  analyses: (AnalysisRow & { article: ArticleRow | null })[];
  counts: { positive: number; neutral: number; negative: number };
}> {
  const conditions = [];

  if (filters.sentiment) {
    conditions.push(eq(analyses.sentiment, filters.sentiment));
  }

  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(ilike(articles.title, pattern), ilike(analyses.summary, pattern))
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: analyses.id,
      articleId: analyses.articleId,
      summary: analyses.summary,
      sentiment: analyses.sentiment,
      rationale: analyses.rationale,
      model: analyses.model,
      createdAt: analyses.createdAt,
      articleId2: articles.id,
      articleUrl: articles.url,
      articleTitle: articles.title,
      articleSource: articles.source,
      articleImageUrl: articles.imageUrl,
      articlePublishedAt: articles.publishedAt,
      articleSnippet: articles.snippet,
      articleCreatedAt: articles.createdAt,
    })
    .from(analyses)
    .innerJoin(articles, eq(analyses.articleId, articles.id))
    .where(whereClause)
    .orderBy(desc(analyses.createdAt))
    .limit(filters.limit)
    .offset(filters.offset);

  const result = rows.map((r: (typeof rows)[number]) => ({
    ...toAnalysisRow(r),
    article: toArticleRow({
      id: r.articleId2,
      url: r.articleUrl,
      title: r.articleTitle,
      source: r.articleSource,
      imageUrl: r.articleImageUrl,
      publishedAt: r.articlePublishedAt,
      snippet: r.articleSnippet,
      createdAt: r.articleCreatedAt,
    }),
  }));

  const countRows = await db
    .select({
      sentiment: analyses.sentiment,
      cnt: count(),
    })
    .from(analyses)
    .groupBy(analyses.sentiment);

  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const r of countRows) {
    const s = r.sentiment as 'positive' | 'neutral' | 'negative';
    counts[s] = Number(r.cnt);
  }

  return { analyses: result, counts };
}

export async function getAnalysisById(
  id: number
): Promise<(AnalysisRow & { article: ArticleRow | null }) | null> {
  const rows = await db
    .select({
      id: analyses.id,
      articleId: analyses.articleId,
      summary: analyses.summary,
      sentiment: analyses.sentiment,
      rationale: analyses.rationale,
      model: analyses.model,
      createdAt: analyses.createdAt,
      articleId2: articles.id,
      articleUrl: articles.url,
      articleTitle: articles.title,
      articleSource: articles.source,
      articleImageUrl: articles.imageUrl,
      articlePublishedAt: articles.publishedAt,
      articleSnippet: articles.snippet,
      articleCreatedAt: articles.createdAt,
    })
    .from(analyses)
    .innerJoin(articles, eq(analyses.articleId, articles.id))
    .where(eq(analyses.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  const r = rows[0];
  return {
    ...toAnalysisRow(r),
    article: toArticleRow({
      id: r.articleId2,
      url: r.articleUrl,
      title: r.articleTitle,
      source: r.articleSource,
      imageUrl: r.articleImageUrl,
      publishedAt: r.articlePublishedAt,
      snippet: r.articleSnippet,
      createdAt: r.articleCreatedAt,
    }),
  };
}

export async function getArticle(id: number): Promise<ArticleRow | null> {
  const rows = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  return toArticleRow(rows[0]);
}
