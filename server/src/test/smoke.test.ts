import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';

vi.mock('../config', () => ({
  env: {
    PORT: 3099,
    GNEWS_KEY: 'smoke-gnews-key',
    OPENAI_KEY: 'smoke-openai-key',
    DATABASE_URL: 'postgres://smoke:smoke@localhost:5432/smoke',
    CLIENT_ORIGIN: 'http://localhost:5173',
  },
}));

vi.mock('../db/migrate', () => ({
  ensureSchema: vi.fn().mockResolvedValue(undefined),
}));

const { mockSearchNews, mockGetTopHeadlines, mockAnalyzeArticle, mockStore } = vi.hoisted(() => {
  const mockSearchNews = vi.fn();
  const mockGetTopHeadlines = vi.fn();
  const mockAnalyzeArticle = vi.fn();
  const mockStore: Record<string, ReturnType<typeof vi.fn>> = {
    upsertArticle: vi.fn(),
    getAnalysisByArticleId: vi.fn(),
    createAnalysis: vi.fn(),
    getAnalyses: vi.fn(),
    getAnalysisById: vi.fn(),
    getArticle: vi.fn(),
  };
  return { mockSearchNews, mockGetTopHeadlines, mockAnalyzeArticle, mockStore };
});

vi.mock('../services/gnews', () => ({
  searchNews: mockSearchNews,
  getTopHeadlines: mockGetTopHeadlines,
  GNewsError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = 'GNewsError';
      this.status = status;
    }
  },
}));

vi.mock('../services/openai', () => ({
  analyzeArticle: mockAnalyzeArticle,
}));

vi.mock('../store', () => mockStore);

import { app } from '../index.js';
import { GNewsError } from '../services/gnews.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Smoke test: full Express app in-process (no Docker, no real DB)', () => {
  describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
      const res = await supertest(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/search', () => {
    it('validates query and returns mapped articles', async () => {
      mockSearchNews.mockResolvedValueOnce({
        articles: [
          {
            url: 'https://news.example.com/1',
            title: 'AI Breakthrough Changes Everything',
            description: 'Scientists announce major AI breakthrough.',
            content: null,
            image: 'https://img.example.com/ai.jpg',
            publishedAt: '2025-06-28T10:00:00Z',
            source: { name: 'Tech Daily', url: 'https://tech.example.com' },
          },
          {
            url: 'https://news.example.com/2',
            title: 'Markets Rally on Fed Decision',
            description: null,
            content: 'Stocks surged today after the Fed decision.',
            image: null,
            publishedAt: '2025-06-28T09:30:00Z',
            source: { name: 'Finance Wire', url: 'https://fin.example.com' },
          },
        ],
        totalArticles: 2,
      });

      const res = await supertest(app).get('/api/search?q=ai');

      expect(res.status).toBe(200);
      expect(res.body.articles).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.articles[0].title).toBe('AI Breakthrough Changes Everything');
      expect(res.body.articles[0].source).toBe('Tech Daily');
      expect(res.body.articles[0].url).toBe('https://news.example.com/1');
      expect(res.body.articles[1].snippet).toBe('Stocks surged today after the Fed decision.');
    });

    it('returns 400 for missing q param', async () => {
      const res = await supertest(app).get('/api/search');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns empty array when no articles found', async () => {
      mockSearchNews.mockResolvedValueOnce({ articles: [], totalArticles: 0 });

      const res = await supertest(app).get('/api/search?q=xyzzyxyzzy');
      expect(res.status).toBe(200);
      expect(res.body.articles).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('propagates GNews errors with correct status', async () => {
      mockSearchNews.mockRejectedValueOnce(
        new GNewsError(429, 'Too many requests to news API. Please wait and try again.')
      );

      const res = await supertest(app).get('/api/search?q=test');

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('NEWS_API_ERROR');
      expect(res.body.error.message).toContain('Too many requests');
    });

    it('handles 401 GNews auth failure', async () => {
      mockSearchNews.mockRejectedValueOnce(
        new GNewsError(401, 'Authentication failed')
      );

      const res = await supertest(app).get('/api/search?q=test');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('NEWS_API_ERROR');
    });
  });

  describe('GET /api/trending', () => {
    it('works without q param', async () => {
      mockGetTopHeadlines.mockResolvedValueOnce({
        articles: [
          {
            url: 'https://news.example.com/hot',
            title: 'Hot Topic Today',
            description: 'Something big happened.',
            content: null,
            image: null,
            publishedAt: '2025-06-28T08:00:00Z',
            source: { name: 'Global News', url: 'https://global.example.com' },
          },
        ],
        totalArticles: 1,
      });

      const res = await supertest(app).get('/api/trending');
      expect(res.status).toBe(200);
      expect(res.body.articles).toHaveLength(1);
      expect(res.body.articles[0].title).toBe('Hot Topic Today');
    });
  });

  describe('POST /api/analyses', () => {
    it('creates a new analysis and returns 201', async () => {
      mockStore.upsertArticle.mockResolvedValueOnce({
        id: 100, url: 'https://example.com/new-article',
        title: 'New Discovery', source: 'Science Weekly',
        imageUrl: null, publishedAt: '2025-06-28T00:00:00Z',
        snippet: 'Scientists found something amazing.', createdAt: '2025-06-28T00:00:00Z',
      });
      mockStore.getAnalysisByArticleId.mockResolvedValueOnce(null);
      mockAnalyzeArticle.mockResolvedValueOnce({
        summary: 'A scientific breakthrough was reported.',
        sentiment: 'positive',
        rationale: 'The article emphasizes discovery and progress.',
        model: 'gpt-4.1-nano',
      });
      mockStore.createAnalysis.mockResolvedValueOnce({
        analysis: {
          id: 200, articleId: 100,
          summary: 'A scientific breakthrough was reported.',
          sentiment: 'positive', rationale: 'The article emphasizes discovery and progress.',
          model: 'gpt-4.1-nano', createdAt: '2025-06-28T00:00:01Z',
        },
        created: true,
      });

      const res = await supertest(app)
        .post('/api/analyses')
        .send({
          url: 'https://example.com/new-article',
          title: 'New Discovery',
          source: 'Science Weekly',
          publishedAt: '2025-06-28T00:00:00Z',
          snippet: 'Scientists found something amazing.',
        });

      expect(res.status).toBe(201);
      expect(res.body.analysis.sentiment).toBe('positive');
      expect(res.body.analysis.summary).toContain('scientific breakthrough');
      expect(res.body.analysis.model).toBe('gpt-4.1-nano');
    });

    it('returns 200 with cached analysis (no OpenAI call)', async () => {
      mockStore.upsertArticle.mockResolvedValueOnce({
        id: 101, url: 'https://example.com/cached',
        title: 'Cached News', source: 'Daily Report',
        imageUrl: null, publishedAt: '2025-06-28T00:00:00Z',
        snippet: 'Some old news.', createdAt: '2025-06-27T00:00:00Z',
      });
      mockStore.getAnalysisByArticleId.mockResolvedValueOnce({
        id: 201, articleId: 101,
        summary: 'Old summary.',
        sentiment: 'neutral',
        rationale: 'Nothing special.',
        model: 'gpt-4.1-nano',
        createdAt: '2025-06-27T00:00:00Z',
      });

      const res = await supertest(app)
        .post('/api/analyses')
        .send({
          url: 'https://example.com/cached',
          title: 'Cached News',
          source: 'Daily Report',
          publishedAt: '2025-06-28T00:00:00Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.analysis.sentiment).toBe('neutral');
      expect(mockAnalyzeArticle).not.toHaveBeenCalled();
    });

    it('coalesces duplicate simultaneous requests (same URL key)', async () => {
      let factoryCalls = 0;
      let resolveDeferred: () => void;
      const deferred = new Promise<void>((resolve) => {
        resolveDeferred = resolve;
      });

      mockStore.upsertArticle.mockImplementation(async (input: {
        url: string; title: string; source: string; publishedAt: string; snippet: string | null;
      }) => {
        factoryCalls++;
        if (factoryCalls === 1) {
          await deferred;
        }
        return {
          id: 200 + factoryCalls, url: input.url,
          title: input.title, source: input.source,
          imageUrl: null, publishedAt: input.publishedAt,
          snippet: input.snippet ?? null, createdAt: '2025-06-28T00:00:00Z',
        };
      });
      mockStore.getAnalysisByArticleId.mockResolvedValue(null);
      mockAnalyzeArticle.mockResolvedValue({
        summary: 'Coalesced summary.',
        sentiment: 'positive',
        rationale: 'Good.',
        model: 'gpt-4.1-nano',
      });
      mockStore.createAnalysis.mockResolvedValue({
        analysis: {
          id: 300, articleId: 200,
          summary: 'Coalesced summary.',
          sentiment: 'positive', rationale: 'Good.',
          model: 'gpt-4.1-nano', createdAt: '2025-06-28T00:00:00Z',
        },
        created: true,
      });

      const payload = {
        url: 'https://example.com/coalesce-test',
        title: 'Coalesce Test',
        source: 'Test',
        publishedAt: '2025-06-28T00:00:00Z',
        snippet: 'Testing coalescing.',
      };

      const reqA = supertest(app).post('/api/analyses').send(payload);
      const reqB = supertest(app).post('/api/analyses').send(payload);

      resolveDeferred!();

      const [resA, resB] = await Promise.all([reqA, reqB]);

      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);
      expect(resA.body.analysis.id).toBe(resB.body.analysis.id);
    });

    it('returns 400 when body fails zod validation', async () => {
      const res = await supertest(app)
        .post('/api/analyses')
        .send({ url: '', title: '', source: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('handles OpenAI failure gracefully', async () => {
      mockStore.upsertArticle.mockResolvedValueOnce({
        id: 102, url: 'https://example.com/fail',
        title: 'Fail News', source: 'Test',
        imageUrl: null, publishedAt: '2025-06-28T00:00:00Z',
        snippet: 'Will fail.', createdAt: '2025-06-28T00:00:00Z',
      });
      mockStore.getAnalysisByArticleId.mockResolvedValueOnce(null);
      mockAnalyzeArticle.mockRejectedValueOnce(
        new Error('OpenAI returned an empty response.')
      );

      const res = await supertest(app)
        .post('/api/analyses')
        .send({
          url: 'https://example.com/fail',
          title: 'Fail News',
          source: 'Test',
          publishedAt: '2025-06-28T00:00:00Z',
          snippet: 'Will fail.',
        });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/analyses', () => {
    it('returns history with sentiment counts', async () => {
      mockStore.getAnalyses.mockResolvedValueOnce({
        analyses: [
          {
            id: 1, articleId: 1, summary: 'Summary A', sentiment: 'positive',
            rationale: 'Great!', model: 'gpt-4.1-nano', createdAt: '2025-06-28T10:00:00Z',
            article: { id: 1, url: 'https://x.com/a', title: 'Article A',
              source: 'Src A', imageUrl: null, publishedAt: '2025-06-28T09:00:00Z',
              snippet: 'Snippet A', createdAt: '2025-06-28T09:00:00Z' },
          },
          {
            id: 2, articleId: 2, summary: 'Summary B', sentiment: 'negative',
            rationale: 'Bad!', model: 'gpt-4.1-nano', createdAt: '2025-06-28T09:00:00Z',
            article: { id: 2, url: 'https://x.com/b', title: 'Article B',
              source: 'Src B', imageUrl: null, publishedAt: '2025-06-28T08:00:00Z',
              snippet: 'Snippet B', createdAt: '2025-06-28T08:00:00Z' },
          },
        ],
        counts: { positive: 1, neutral: 0, negative: 1 },
      });

      const res = await supertest(app).get('/api/analyses');

      expect(res.status).toBe(200);
      expect(res.body.analyses).toHaveLength(2);
      expect(res.body.counts).toEqual({ positive: 1, neutral: 0, negative: 1 });
      expect(res.body.analyses[0].article.title).toBe('Article A');
    });

    it('filters by sentiment', async () => {
      mockStore.getAnalyses.mockResolvedValueOnce({
        analyses: [], counts: { positive: 1, neutral: 0, negative: 1 },
      });

      await supertest(app).get('/api/analyses?sentiment=positive');

      expect(mockStore.getAnalyses).toHaveBeenCalledWith(
        expect.objectContaining({ sentiment: 'positive' })
      );
    });

    it('defaults to limit=20 offset=0', async () => {
      mockStore.getAnalyses.mockResolvedValueOnce({
        analyses: [], counts: { positive: 0, neutral: 0, negative: 0 },
      });

      await supertest(app).get('/api/analyses');

      expect(mockStore.getAnalyses).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, offset: 0 })
      );
    });
  });

  describe('GET /api/analyses/:id', () => {
    it('returns a single analysis with article', async () => {
      mockStore.getAnalysisById.mockResolvedValueOnce({
        id: 1, articleId: 1, summary: 'Single summary',
        sentiment: 'neutral', rationale: 'Meh.',
        model: 'gpt-4.1-nano', createdAt: '2025-06-28T12:00:00Z',
        article: { id: 1, url: 'https://x.com/s', title: 'Single',
          source: 'Src', imageUrl: null, publishedAt: '2025-06-28T11:00:00Z',
          snippet: 'Snip', createdAt: '2025-06-28T11:00:00Z' },
      });

      const res = await supertest(app).get('/api/analyses/1');

      expect(res.status).toBe(200);
      expect(res.body.analysis.article.title).toBe('Single');
    });

    it('returns 400 for non-numeric id', async () => {
      const res = await supertest(app).get('/api/analyses/abc');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for missing analysis', async () => {
      mockStore.getAnalysisById.mockResolvedValueOnce(null);

      const res = await supertest(app).get('/api/analyses/99999');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Cross-cutting concerns', () => {
    it('sets CORS header from config', async () => {
      const res = await supertest(app).get('/api/health');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('rejects malformed JSON with 400', async () => {
      const res = await supertest(app)
        .post('/api/analyses')
        .set('Content-Type', 'application/json')
        .send('not json');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PARSE_ERROR');
    });

    it('returns 404 for unknown routes', async () => {
      const res = await supertest(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
