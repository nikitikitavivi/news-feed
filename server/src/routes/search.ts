import { Router } from 'express';
import { z } from 'zod';
import { searchNews, getTopHeadlines } from '../services/gnews';
import { asyncHandler } from '../lib/errors';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  lang: z.string().min(2).max(5).optional(),
  country: z.string().min(2).max(5).optional(),
  max: z.coerce.number().int().min(1).max(10).optional(),
});

router.get(
  '/api/search',
  asyncHandler(async (req, res) => {
    const params = searchQuerySchema.parse(req.query);

    const result = await searchNews({
      q: params.q,
      lang: params.lang,
      country: params.country,
    });

    const dtos = result.articles.map((a) => ({
      url: a.url,
      title: a.title,
      source: a.source.name,
      imageUrl: a.image,
      publishedAt: a.publishedAt,
      snippet: a.description || a.content,
    }));

    res.json({ articles: dtos, total: result.totalArticles });
  })
);

const trendingQuerySchema = z.object({
  lang: z.string().min(2).max(5).optional(),
  country: z.string().min(2).max(5).optional(),
  max: z.coerce.number().int().min(1).max(10).optional(),
});

router.get(
  '/api/trending',
  asyncHandler(async (req, res) => {
    const params = trendingQuerySchema.parse(req.query);

    const result = await getTopHeadlines({
      lang: params.lang,
      country: params.country,
      category: 'general',
    });

    const dtos = result.articles.map((a) => ({
      url: a.url,
      title: a.title,
      source: a.source.name,
      imageUrl: a.image,
      publishedAt: a.publishedAt,
      snippet: a.description || a.content,
    }));

    res.json({ articles: dtos, total: result.totalArticles });
  })
);

export default router;
