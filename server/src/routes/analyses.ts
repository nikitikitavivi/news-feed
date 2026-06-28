import { Router } from 'express';
import { z } from 'zod';
import {
  upsertArticle,
  getAnalysisByArticleId,
  createAnalysis,
  getAnalyses,
  getAnalysisById,
} from '../store.js';
import { analyzeArticle } from '../services/openai.js';
import { errorResponse, asyncHandler } from '../lib/errors.js';

const router = Router();

const createAnalysisBody = z.object({
  url: z.string().url().refine(
    (url) => /^https?:\/\//i.test(url),
    { message: 'URL must use http or https scheme' }
  ),
  title: z.string().min(1),
  source: z.string().min(1),
  publishedAt: z.string().min(1),
  snippet: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  lang: z.string().max(5).nullable().optional(),
  country: z.string().max(5).nullable().optional(),
});

const listQuery = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

router.post(
  '/api/analyses',
  asyncHandler(async (req, res) => {
    const body = createAnalysisBody.parse(req.body);

    const article = await upsertArticle({
      url: body.url,
      title: body.title,
      source: body.source,
      publishedAt: body.publishedAt,
      snippet: body.snippet ?? null,
      imageUrl: body.imageUrl ?? null,
    });

    const existing = await getAnalysisByArticleId(article.id);
    if (existing) {
      res.status(200).json({ analysis: existing });
      return;
    }

    const analysisResult = await analyzeArticle({
      title: article.title,
      snippet: article.snippet,
      lang: body.lang ?? undefined,
      country: body.country ?? undefined,
    });

    const { analysis, created } = await createAnalysis(article, {
      summary: analysisResult.summary,
      sentiment: analysisResult.sentiment,
      rationale: analysisResult.rationale,
      model: analysisResult.model,
    });

    res.status(created ? 201 : 200).json({ analysis });
  })
);

router.get(
  '/api/analyses',
  asyncHandler(async (req, res) => {
    const params = listQuery.parse(req.query);

    const result = await getAnalyses({
      sentiment: params.sentiment,
      q: params.q,
      limit: params.limit,
      offset: params.offset,
    });

    res.json({
      analyses: result.analyses,
      counts: result.counts,
    });
  })
);

router.get(
  '/api/analyses/:id',
  asyncHandler(async (req, res) => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid analysis ID.'));
      return;
    }

    const analysis = await getAnalysisById(id);
    if (!analysis) {
      res.status(404).json(errorResponse('NOT_FOUND', 'Analysis not found.'));
      return;
    }

    res.json({ analysis });
  })
);

export default router;
