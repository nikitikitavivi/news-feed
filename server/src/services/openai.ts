import OpenAI from 'openai';
import { env } from '../config';

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

export interface AnalysisResult {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  rationale: string;
  model: string;
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
    `\nAnalyze the sentiment of this news article based on the available excerpt. Provide a summary, sentiment (positive/neutral/negative), and rationale.`,
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
    throw new Error('OpenAI returned an empty response.');
  }

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(raw) as AnalysisResult;
  } catch {
    const trimmed = raw.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('{')) {
      throw new Error('OpenAI refused or returned non-JSON content.');
    }
    throw new Error('OpenAI returned unparseable JSON.');
  }

  if (!['positive', 'neutral', 'negative'].includes(parsed.sentiment)) {
    throw new Error(`Invalid sentiment from OpenAI: ${parsed.sentiment}`);
  }

  return {
    summary: parsed.summary || 'No summary available.',
    sentiment: parsed.sentiment,
    rationale: parsed.rationale || 'No rationale provided.',
    model: completion.model,
  };
}
