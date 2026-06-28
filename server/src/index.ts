import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config';
import { errorHandler } from './lib/errors';
import { ensureSchema } from './db/migrate';
import searchRouter from './routes/search';
import analysesRouter from './routes/analyses';

const app = express();

app.set('trust proxy', 1);

app.use(express.json());
app.use(cors({ origin: env.CLIENT_ORIGIN }));

const analysesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests. Please slow down.' } },
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests. Please slow down.' } },
});

app.use('/api/analyses', analysesLimiter);
app.use('/api/search', searchLimiter);
app.use('/api/trending', searchLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(searchRouter);
app.use(analysesRouter);

app.use(errorHandler);

export { app };
export default app;

async function start() {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('[server] Failed to ensure DB schema:', err);
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`[server] running on http://localhost:${env.PORT}`);
    console.log(`[server] CORS origin: ${env.CLIENT_ORIGIN}`);
  });
}

const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  start();
}
