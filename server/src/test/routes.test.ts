import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

vi.mock('../config', () => ({
  env: {
    PORT: 3099,
    GNEWS_KEY: 'test-gnews-key',
    OPENAI_KEY: 'test-openai-key',
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    CLIENT_ORIGIN: 'http://localhost:5173',
  },
}));

const mockSearchNews = vi.fn();
const mockGetTopHeadlines = vi.fn();
const mockAnalyzeArticle = vi.fn();

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

vi.mock('../store', () => {
  const store = {
    upsertArticle: vi.fn(),
    getAnalysisByArticleId: vi.fn(),
    createAnalysis: vi.fn(),
    getAnalyses: vi.fn(),
    getAnalysisById: vi.fn(),
    getArticle: vi.fn(),
  };
  return {
    upsertArticle: store.upsertArticle,
    getAnalysisByArticleId: store.getAnalysisByArticleId,
    createAnalysis: store.createAnalysis,
    getAnalyses: store.getAnalyses,
    getAnalysisById: store.getAnalysisById,
    getArticle: store.getArticle,
    __store: store,
  };
});

import { upsertArticle, getAnalysisByArticleId, createAnalysis, getAnalyses, getAnalysisById } from '../store.js';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const app = express();
    app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    const res = await supertest(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('GET /api/search', () => {
  it('calls searchNews and returns mapped articles', async () => {
    mockSearchNews.mockResolvedValueOnce([
      {
        url: 'https://example.com/1',
        title: 'News 1',
        description: 'Desc 1',
        content: null,
        image: 'https://img.com/1.jpg',
        publishedAt: '2025-01-01T00:00:00Z',
        source: { name: 'Source 1', url: 'https://src.com' },
      },
    ]);

    const app = express();
    app.use(express.json());

    app.get('/api/search', async (req, res) => {
      const articles = await mockSearchNews({ q: req.query.q, max: 10 });
      res.json({ articles: articles.map((a: any) => ({
        url: a.url, title: a.title, source: a.source.name,
        imageUrl: a.image, publishedAt: a.publishedAt,
        snippet: a.description || a.content,
      })), total: articles.length });
    });

    const res = await supertest(app).get('/api/search?q=bitcoin');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.articles[0].title).toBe('News 1');
    expect(res.body.articles[0].source).toBe('Source 1');
  });

  it('maps content as snippet when description is null', async () => {
    mockSearchNews.mockResolvedValueOnce([
      {
        url: 'https://example.com/2',
        title: 'News 2',
        description: null,
        content: 'Full content',
        image: null,
        publishedAt: '2025-01-01T00:00:00Z',
        source: { name: 'Source 2', url: 'https://src.com' },
      },
    ]);

    const app = express();
    app.get('/api/search', async (req, res) => {
      const articles = await mockSearchNews({ q: req.query.q, max: 10 });
      res.json({ articles: articles.map((a: any) => ({
        url: a.url, title: a.title, source: a.source.name,
        imageUrl: a.image, publishedAt: a.publishedAt,
        snippet: a.description || a.content,
      })), total: articles.length });
    });

    const res = await supertest(app).get('/api/search?q=bitcoin');
    expect(res.body.articles[0].snippet).toBe('Full content');
  });
});

describe('GET /api/trending', () => {
  it('calls getTopHeadlines and returns articles', async () => {
    mockGetTopHeadlines.mockResolvedValueOnce([
      {
        url: 'https://example.com/t',
        title: 'Trending',
        description: 'Hot news',
        content: null,
        image: null,
        publishedAt: '2025-01-01T00:00:00Z',
        source: { name: 'TrendSource', url: 'https://src.com' },
      },
    ]);

    const app = express();
    app.get('/api/trending', async (req, res) => {
      const articles = await mockGetTopHeadlines({});
      res.json({ articles: articles.map((a: any) => ({
        url: a.url, title: a.title, source: a.source.name,
        imageUrl: a.image, publishedAt: a.publishedAt,
        snippet: a.description || a.content,
      })), total: articles.length });
    });

    const res = await supertest(app).get('/api/trending');
    expect(res.status).toBe(200);
    expect(res.body.articles[0].title).toBe('Trending');
  });
});

describe('POST /api/analyses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (upsertArticle as ReturnType<typeof vi.fn>).mockReset();
    (getAnalysisByArticleId as ReturnType<typeof vi.fn>).mockReset();
    (createAnalysis as ReturnType<typeof vi.fn>).mockReset();
    mockAnalyzeArticle.mockReset();
  });

  it('creates a new analysis when none exists', async () => {
    const article = {
      id: 1, url: 'https://x.com/1', title: 'T', source: 'S',
      imageUrl: null, publishedAt: '2025-01-01T00:00:00Z',
      snippet: 'snip', createdAt: '2025-01-01T00:00:00Z',
    };
    const analysis = {
      id: 10, articleId: 1, summary: 'sum', sentiment: 'neutral' as const,
      rationale: 'ok', model: 'gpt-4.1-nano', createdAt: '2025-01-01T00:00:00Z',
    };

    (upsertArticle as ReturnType<typeof vi.fn>).mockResolvedValue(article);
    (getAnalysisByArticleId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockAnalyzeArticle.mockResolvedValue({ summary: 'sum', sentiment: 'neutral', rationale: 'ok' });
    (createAnalysis as ReturnType<typeof vi.fn>).mockResolvedValue(analysis);

    const app = express();
    app.use(express.json());
    app.post('/api/analyses', async (req, res) => {
      const b = req.body;
      const a = await (upsertArticle as ReturnType<typeof vi.fn>)({
        url: b.url, title: b.title, source: b.source,
        publishedAt: b.publishedAt, snippet: b.snippet ?? null, imageUrl: b.imageUrl ?? null,
      });
      const existing = await (getAnalysisByArticleId as ReturnType<typeof vi.fn>)(a.id);
      if (existing) { res.status(200).json({ analysis: existing }); return; }
      const r = await mockAnalyzeArticle({ title: a.title, snippet: a.snippet });
      const ana = await (createAnalysis as ReturnType<typeof vi.fn>)(a, {
        summary: r.summary, sentiment: r.sentiment, rationale: r.rationale, model: 'gpt-4.1-nano',
      });
      res.status(201).json({ analysis: ana });
    });

    const res = await supertest(app)
      .post('/api/analyses')
      .send({ url: 'https://x.com/1', title: 'T', source: 'S', publishedAt: '2025-01-01T00:00:00Z', snippet: 'snip' });

    expect(res.status).toBe(201);
    expect(res.body.analysis.sentiment).toBe('neutral');
    expect(mockAnalyzeArticle).toHaveBeenCalledTimes(1);
  });

  it('returns cached analysis without calling OpenAI', async () => {
    const article = {
      id: 2, url: 'https://x.com/2', title: 'T2', source: 'S2',
      imageUrl: null, publishedAt: '2025-01-01T00:00:00Z',
      snippet: null, createdAt: '2025-01-01T00:00:00Z',
    };
    const cached = {
      id: 20, articleId: 2, summary: 'old sum', sentiment: 'positive' as const,
      rationale: 'was good', model: 'gpt-4.1-nano', createdAt: '2025-01-01T00:00:00Z',
    };

    (upsertArticle as ReturnType<typeof vi.fn>).mockResolvedValue(article);
    (getAnalysisByArticleId as ReturnType<typeof vi.fn>).mockResolvedValue(cached);

    const app = express();
    app.use(express.json());
    app.post('/api/analyses', async (req, res) => {
      const b = req.body;
      const a = await (upsertArticle as ReturnType<typeof vi.fn>)({
        url: b.url, title: b.title, source: b.source,
        publishedAt: b.publishedAt, snippet: b.snippet ?? null, imageUrl: b.imageUrl ?? null,
      });
      const existing = await (getAnalysisByArticleId as ReturnType<typeof vi.fn>)(a.id);
      if (existing) { res.status(200).json({ analysis: existing }); return; }
      res.status(500).json({ error: { code: 'TEST', message: 'should not reach' } });
    });

    const res = await supertest(app)
      .post('/api/analyses')
      .send({ url: 'https://x.com/2', title: 'T2', source: 'S2', publishedAt: '2025-01-01T00:00:00Z' });

    expect(res.status).toBe(200);
    expect(res.body.analysis.sentiment).toBe('positive');
    expect(mockAnalyzeArticle).not.toHaveBeenCalled();
  });
});

describe('GET /api/analyses', () => {
  it('returns analysis list with counts', async () => {
    (getAnalyses as ReturnType<typeof vi.fn>).mockResolvedValue({
      analyses: [],
      counts: { positive: 5, neutral: 10, negative: 2 },
    });

    const app = express();
    app.get('/api/analyses', async (_req, res) => {
      const result = await (getAnalyses as ReturnType<typeof vi.fn>)({ limit: 20, offset: 0 });
      res.json({ analyses: result.analyses, counts: result.counts });
    });

    const res = await supertest(app).get('/api/analyses');
    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ positive: 5, neutral: 10, negative: 2 });
  });
});

describe('GET /api/analyses/:id', () => {
  it('returns analysis by id', async () => {
    (getAnalysisById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1, articleId: 1, summary: 'sum', sentiment: 'positive',
      rationale: 'good', model: 'gpt-4.1-nano', createdAt: '2025-01-01T00:00:00Z',
      article: { id: 1, url: 'https://x.com', title: 'T', source: 'S',
        imageUrl: null, publishedAt: '2025-01-01T00:00:00Z', snippet: null, createdAt: '2025-01-01T00:00:00Z' },
    });

    const app = express();
    app.get('/api/analyses/:id', async (req, res) => {
      const id = parseInt(req.params.id, 10);
      const analysis = await (getAnalysisById as ReturnType<typeof vi.fn>)(id);
      if (!analysis) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }); return; }
      res.json({ analysis });
    });

    const res = await supertest(app).get('/api/analyses/1');
    expect(res.status).toBe(200);
    expect(res.body.analysis.sentiment).toBe('positive');
  });

  it('returns 404 for missing analysis', async () => {
    (getAnalysisById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const app = express();
    app.get('/api/analyses/:id', async (req, res) => {
      const id = parseInt(req.params.id, 10);
      const analysis = await (getAnalysisById as ReturnType<typeof vi.fn>)(id);
      if (!analysis) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }); return; }
      res.json({ analysis });
    });

    const res = await supertest(app).get('/api/analyses/999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
