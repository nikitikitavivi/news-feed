import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().default(3001),
  GNEWS_KEY: z.string().min(1, 'GNEWS_KEY is required'),
  OPENAI_KEY: z.string().min(1, 'OPENAI_KEY is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLIENT_ORIGIN: z.string().optional(),
});

function loadEnv() {
  const raw = {
    PORT: process.env.PORT,
    GNEWS_KEY: process.env.GNEWS_KEY,
    OPENAI_KEY: process.env.OPENAI_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  };

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const clientOrigin =
    result.data.CLIENT_ORIGIN ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    'http://localhost:5173';

  return { ...result.data, CLIENT_ORIGIN: clientOrigin };
}

export const env = loadEnv();
