import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_KEY,
  timeout: 30_000,
  maxRetries: 0,
});

const SENTIMENT_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'sentiment_analysis',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description:
            'A 2-3 sentence summary of the article based on the provided excerpt. Capture the key facts, context, and implications. Be informative and specific.',
        },
        sentiment: {
          type: 'string',
          enum: ['positive', 'neutral', 'negative'],
          description:
            'The overall sentiment of the article. positive = good news/optimism/achievement, negative = bad news/crisis/threat, neutral = factual/balanced reporting.',
        },
        rationale: {
          type: 'string',
          description:
            'A brief 1-sentence explanation of why this sentiment was chosen, citing elements from the text.',
        },
      },
      required: ['summary', 'sentiment', 'rationale'],
      additionalProperties: false,
    },
  },
};

const analysisResultSchema = z.object({
  summary: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  rationale: z.string(),
});

export interface AnalysisResult {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  rationale: string;
  model: string;
}

export class OpenAIError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'OpenAIError';
    this.status = status;
  }
}

export async function analyzeArticle(input: {
  title: string;
  snippet: string | null;
  lang?: string;
  country?: string;
}): Promise<AnalysisResult> {
  const excerpt = input.snippet || input.title;

  const langNames: Record<string, string> = {
    ar: 'Arabic', bn: 'Bengali', zh: 'Chinese', nl: 'Dutch', en: 'English',
    fr: 'French', de: 'German', el: 'Greek', he: 'Hebrew', hi: 'Hindi',
    id: 'Indonesian', it: 'Italian', ja: 'Japanese', ml: 'Malayalam',
    mr: 'Marathi', no: 'Norwegian', pt: 'Portuguese', pa: 'Punjabi',
    ro: 'Romanian', ru: 'Russian', es: 'Spanish', sv: 'Swedish',
    ta: 'Tamil', te: 'Telugu', tr: 'Turkish', uk: 'Ukrainian',
  };

  const countryNames: Record<string, string> = {
    ar: 'Argentina', au: 'Australia', bd: 'Bangladesh', br: 'Brazil',
    ca: 'Canada', cn: 'China', co: 'Colombia', eg: 'Egypt', fr: 'France',
    de: 'Germany', gr: 'Greece', hk: 'Hong Kong', in: 'India',
    id: 'Indonesia', ie: 'Ireland', il: 'Israel', it: 'Italy', jp: 'Japan',
    my: 'Malaysia', mx: 'Mexico', nl: 'Netherlands', no: 'Norway',
    pk: 'Pakistan', pe: 'Peru', ph: 'Philippines', pt: 'Portugal',
    ro: 'Romania', ru: 'Russia', sg: 'Singapore', es: 'Spain', se: 'Sweden',
    ch: 'Switzerland', tw: 'Taiwan', tr: 'Turkey', ua: 'Ukraine',
    gb: 'United Kingdom', us: 'United States',
  };

  const instructions: string[] = [
    `Title: ${input.title}`,
    `Excerpt: ${excerpt}`,
    '\nAnalyze the sentiment of this news article based on the available excerpt. Provide a summary, sentiment (positive/neutral/negative), and rationale.',
  ];

  if (input.lang && input.lang !== 'en' && langNames[input.lang]) {
    instructions.push(`Write the summary and rationale in ${langNames[input.lang]} language. Keep sentiment value as "positive", "neutral", or "negative" in English.`);
  }

  if (input.country && countryNames[input.country]) {
    instructions.push(`This article is from ${countryNames[input.country]}. Consider local context and relevance when writing the summary.`);
  }

  const userPrompt = instructions.join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    messages: [
      {
        role: 'system',
        content:
          'You analyze news articles for sentiment. Return a structured JSON response with summary, sentiment, and rationale.',
      },
      { role: 'user', content: userPrompt },
    ],
    response_format: SENTIMENT_SCHEMA,
    temperature: 0.3,
    max_completion_tokens: 400,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new OpenAIError(503, 'OpenAI returned an empty response.');
  }

  const result = analysisResultSchema.safeParse(
    (() => {
      try {
        return JSON.parse(raw);
      } catch {
        throw new OpenAIError(503, 'OpenAI returned unparseable JSON.');
      }
    })()
  );

  if (!result.success) {
    throw new OpenAIError(503, 'OpenAI response failed schema validation.');
  }

  return {
    summary: result.data.summary,
    sentiment: result.data.sentiment,
    rationale: result.data.rationale,
    model: completion.model,
  };
}
