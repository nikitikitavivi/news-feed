const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
    } catch {
      // ignore parse errors, use default message
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface SearchResult {
  url: string;
  title: string;
  source: string;
  imageUrl: string | null;
  publishedAt: string;
  snippet: string | null;
}

export interface Article {
  id: number;
  url: string;
  title: string;
  source: string;
  imageUrl: string | null;
  publishedAt: string;
  snippet: string | null;
  createdAt: string;
}

export interface Analysis {
  id: number;
  articleId: number;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  rationale: string;
  model: string;
  createdAt: string;
  article: Article | null;
}

export interface AnalysesResponse {
  analyses: Analysis[];
  counts: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export async function searchArticles(
  query: string,
  lang?: string,
  country?: string
): Promise<SearchResult[]> {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('max', '10');
  if (lang) params.set('lang', lang);
  if (country) params.set('country', country);

  const data = await request<{ articles: SearchResult[]; total: number }>(
    `/api/search?${params.toString()}`
  );
  return data.articles;
}

export async function fetchTrending(
  lang?: string,
  country?: string
): Promise<SearchResult[]> {
  const params = new URLSearchParams();
  params.set('max', '10');
  if (lang) params.set('lang', lang);
  if (country) params.set('country', country);

  const data = await request<{ articles: SearchResult[]; total: number }>(
    `/api/trending?${params.toString()}`
  );
  return data.articles;
}

export async function analyzeArticle(article: {
  url: string;
  title: string;
  source: string;
  publishedAt: string;
  snippet?: string | null;
  imageUrl?: string | null;
  language?: string;
  country?: string;
}): Promise<Analysis> {
  const data = await request<{ analysis: Analysis }>('/api/analyses', {
    method: 'POST',
    body: JSON.stringify({
      url: article.url,
      title: article.title,
      source: article.source,
      publishedAt: article.publishedAt,
      snippet: article.snippet,
      imageUrl: article.imageUrl,
      lang: article.language || undefined,
      country: article.country || undefined,
    }),
  });
  return data.analysis;
}

export function safeUrl(url: string | null | undefined): string {
  if (url && /^https?:\/\//i.test(url)) return url;
  return '#';
}

export async function getAnalyses(
  sentiment?: string,
  q?: string,
  limit: number = 20,
  offset: number = 0
): Promise<AnalysesResponse> {
  const params = new URLSearchParams();
  if (sentiment && sentiment !== 'all') params.set('sentiment', sentiment);
  if (q) params.set('q', q);
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  return request<AnalysesResponse>(`/api/analyses?${params.toString()}`);
}
