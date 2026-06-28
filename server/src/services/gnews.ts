import { env } from '../config';
import { z } from 'zod';

const gnewsArticleSchema = z.object({
  title: z.string(),
  description: z.string().nullable().default(null),
  content: z.string().nullable().default(null),
  url: z.string().url(),
  image: z.string().nullable().default(null),
  publishedAt: z.string(),
  source: z.object({
    name: z.string(),
    url: z.string(),
  }),
});

const gnewsResponseSchema = z.object({
  totalArticles: z.number(),
  articles: z.array(gnewsArticleSchema),
});

const gnewsErrorSchema = z.object({
  errors: z.union([z.array(z.string()), z.record(z.string())]),
});

export type GNewsArticle = z.infer<typeof gnewsArticleSchema>;

export interface GNewsErrorResponse {
  status: number;
  message: string;
}

export class GNewsError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GNewsError';
    this.status = status;
  }
}

export interface GNewsResult {
  articles: GNewsArticle[];
  totalArticles: number;
}

async function gnewsFetch(
  endpoint: string,
  params: Record<string, string>
): Promise<GNewsResult> {
  const searchParams = new URLSearchParams({
    apikey: env.GNEWS_KEY,
    max: '10',
    ...params,
  });

  const url = `https://gnews.io/api/v4/${endpoint}?${searchParams.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new GNewsError(504, 'News API request timed out. Please try again.');
    }
    throw new GNewsError(503, 'News API is temporarily unavailable. Please try again later.');
  }

  if (!response.ok) {
    let errorMsg = `News API error (${response.status})`;

    try {
      const body = await response.text();
      const parsed = gnewsErrorSchema.parse(JSON.parse(body));
      if (Array.isArray(parsed.errors)) {
        errorMsg = parsed.errors[0] ?? errorMsg;
      } else {
        errorMsg = Object.values(parsed.errors)[0] ?? errorMsg;
      }
    } catch {
      // use default message
    }

    if (response.status === 403) {
      throw new GNewsError(429, 'News API daily quota exceeded. Try again after midnight UTC.');
    }
    if (response.status === 429) {
      throw new GNewsError(429, 'Too many requests to news API. Please wait and try again.');
    }
    if (response.status === 401) {
      throw new GNewsError(503, 'News API authentication failed. Please check configuration.');
    }

    throw new GNewsError(response.status, errorMsg);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GNewsError(502, 'Invalid response from news API.');
  }

  const parsed = gnewsResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new GNewsError(502, 'Unexpected response format from news API.');
  }

  return {
    articles: parsed.data.articles,
    totalArticles: parsed.data.totalArticles,
  };
}

export async function getTopHeadlines(params: {
  lang?: string;
  country?: string;
  category?: string;
}): Promise<GNewsResult> {
  return gnewsFetch('top-headlines', {
    category: params.category ?? 'general',
    ...(params.lang && { lang: params.lang }),
    ...(params.country && { country: params.country }),
  });
}

export async function searchNews(params: {
  q: string;
  lang?: string;
  country?: string;
}): Promise<GNewsResult> {
  return gnewsFetch('search', {
    q: params.q,
    ...(params.lang && { lang: params.lang }),
    ...(params.country && { country: params.country }),
  });
}
