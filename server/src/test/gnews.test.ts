import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTopHeadlines, searchNews, GNewsError } from '../services/gnews';
import type { GNewsArticle } from '../services/gnews';

vi.mock('../config', () => ({
  env: { GNEWS_KEY: 'test-gnews-key' },
}));

function mockArticle(overrides: Partial<GNewsArticle> = {}): GNewsArticle {
  return {
    title: 'Test Article',
    description: 'A test description',
    content: 'Full test content',
    url: 'https://example.com/article',
    image: 'https://example.com/img.jpg',
    publishedAt: '2025-01-01T00:00:00Z',
    source: { name: 'Test Source', url: 'https://example.com' },
    ...overrides,
  };
}

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = originalFetch;
});

describe('getTopHeadlines', () => {
  it('parses a successful response', async () => {
    const article = mockArticle();
    global.fetch = mockFetch(200, { totalArticles: 10, articles: [article] });

    const result = await getTopHeadlines({});

    expect(result.articles).toHaveLength(1);
    expect(result.totalArticles).toBe(10);
    expect(result.articles[0].title).toBe('Test Article');
    expect(result.articles[0].source.name).toBe('Test Source');
  });

  it('passes params in the URL', async () => {
    const article = mockArticle();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ totalArticles: 1, articles: [article] }),
      text: () => Promise.resolve(''),
    });

    await getTopHeadlines({ lang: 'fr', country: 'fr' });

    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('apikey=test-gnews-key');
    expect(url).toContain('lang=fr');
    expect(url).toContain('country=fr');
    expect(url).toContain('max=10');
  });

  it('throws on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(getTopHeadlines({})).rejects.toThrow(GNewsError);
    try {
      await getTopHeadlines({});
    } catch (err) {
      const gerr = err as GNewsError;
      expect(gerr.status).toBe(503);
      expect(gerr.message).toContain('temporarily unavailable');
    }
  });

  it('handles 401 as auth failure', async () => {
    global.fetch = mockFetch(401, '{}');

    try {
      await getTopHeadlines({});
    } catch (err) {
      const gerr = err as GNewsError;
      expect(gerr.status).toBe(503);
      expect(gerr.message).toContain('authentication failed');
    }
  });

  it('handles 403 as quota exceeded', async () => {
    global.fetch = mockFetch(403, '{}');

    try {
      await getTopHeadlines({});
    } catch (err) {
      const gerr = err as GNewsError;
      expect(gerr.status).toBe(429);
      expect(gerr.message).toContain('quota exceeded');
    }
  });

  it('handles 429 as rate limit', async () => {
    global.fetch = mockFetch(429, '{}');

    try {
      await getTopHeadlines({});
    } catch (err) {
      const gerr = err as GNewsError;
      expect(gerr.status).toBe(429);
      expect(gerr.message).toContain('Too many requests');
    }
  });

  it('handles invalid JSON body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Unexpected token')),
      text: () => Promise.resolve(''),
    });

    try {
      await getTopHeadlines({});
    } catch (err) {
      const gerr = err as GNewsError;
      expect(gerr.status).toBe(502);
      expect(gerr.message).toContain('Invalid response');
    }
  });

  it('handles unexpected body shape', async () => {
    global.fetch = mockFetch(200, { wrong: 'shape' });

    try {
      await getTopHeadlines({});
    } catch (err) {
      const gerr = err as GNewsError;
      expect(gerr.status).toBe(502);
      expect(gerr.message).toContain('Unexpected response format');
    }
  });

  it('parses GNews error body', async () => {
    global.fetch = mockFetch(400, { errors: ['Invalid country'] });

    try {
      await getTopHeadlines({ country: 'xx' });
    } catch (err) {
      const gerr = err as GNewsError;
      expect(gerr.message).toBe('Invalid country');
    }
  });
});

describe('searchNews', () => {
  it('includes the query param', async () => {
    const article = mockArticle();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ totalArticles: 1, articles: [article] }),
      text: () => Promise.resolve(''),
    });

    await searchNews({ q: 'bitcoin' });

    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('q=bitcoin');
    expect(url).toContain('api/v4/search');
  });

  it('handles GNews error object form', async () => {
    global.fetch = mockFetch(400, { errors: { field: 'q is required' } });

    try {
      await searchNews({ q: '' });
    } catch (err) {
      const gerr = err as GNewsError;
      expect(gerr.message).toBe('q is required');
    }
  });
});
