import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({
  env: { OPENAI_KEY: 'test-openai-key' },
}));

const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  return { mockCreate };
});

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import { analyzeArticle } from '../services/openai.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('analyzeArticle', () => {
  it('calls OpenAI and returns structured result', async () => {
    mockCreate.mockResolvedValueOnce({
      model: 'gpt-4.1-nano',
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'A breakthrough in renewable energy was announced.',
              sentiment: 'positive',
              rationale: 'The article highlights progress and optimistic forecasts.',
            }),
          },
        },
      ],
    });

    const result = await analyzeArticle({
      title: 'Renewable Energy Breakthrough',
      snippet: 'Scientists have made a major breakthrough in renewable energy.',
    });

    expect(result.summary).toBe('A breakthrough in renewable energy was announced.');
    expect(result.sentiment).toBe('positive');
    expect(result.rationale).toContain('optimistic');

    const callArgs = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.model).toBe('gpt-4.1-nano');
    expect(callArgs.temperature).toBe(0.3);
  });

  it('falls back to snippet when no snippet is provided (title only)', async () => {
    mockCreate.mockResolvedValueOnce({
      model: 'gpt-4.1-nano',
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Summary from title only.',
              sentiment: 'neutral',
              rationale: 'Based on limited info.',
            }),
          },
        },
      ],
    });

    const result = await analyzeArticle({
      title: 'Breaking News',
      snippet: null,
    });

    expect(result.sentiment).toBe('neutral');

    const callArgs = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    const messages = callArgs.messages as Array<{ role: string; content: string }>;
    expect(messages[1].content).toContain('Excerpt: Breaking News');
  });

  it('throws on empty OpenAI response', async () => {
    mockCreate.mockResolvedValueOnce({
      model: 'gpt-4.1-nano',
      choices: [{ message: { content: null } }],
    });

    await expect(
      analyzeArticle({ title: 'Test', snippet: 'Test' })
    ).rejects.toThrow('empty response');
  });

  it('throws on invalid sentiment value', async () => {
    mockCreate.mockResolvedValueOnce({
      model: 'gpt-4.1-nano',
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Summary.',
              sentiment: 'angry',
              rationale: 'Because.',
            }),
          },
        },
      ],
    });

    await expect(
      analyzeArticle({ title: 'Test', snippet: 'Test' })
    ).rejects.toThrow('Invalid sentiment');
  });

  it('fills in defaults for missing summary/rationale', async () => {
    mockCreate.mockResolvedValueOnce({
      model: 'gpt-4.1-nano',
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: '',
              sentiment: 'neutral',
              rationale: '',
            }),
          },
        },
      ],
    });

    const result = await analyzeArticle({ title: 'Test', snippet: 'Test' });

    expect(result.summary).toBe('No summary available.');
    expect(result.rationale).toBe('No rationale provided.');
  });

  it('includes language instruction when lang is provided', async () => {
    mockCreate.mockResolvedValueOnce({
      model: 'gpt-4.1-nano',
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Resumen en español.',
              sentiment: 'neutral',
              rationale: 'Es neutral.',
            }),
          },
        },
      ],
    });

    await analyzeArticle({ title: 'Noticia', snippet: 'Texto', lang: 'es' });

    const callArgs = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0] as Record<string, unknown>;
    const messages = callArgs.messages as Array<{ role: string; content: string }>;
    expect(messages[1].content).toContain('Spanish');
  });

  it('includes country context when country is provided', async () => {
    mockCreate.mockResolvedValueOnce({
      model: 'gpt-4.1-nano',
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Summary.',
              sentiment: 'neutral',
              rationale: 'OK.',
            }),
          },
        },
      ],
    });

    await analyzeArticle({ title: 'News', snippet: 'Text', country: 'jp' });

    const callArgs = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0] as Record<string, unknown>;
    const messages = callArgs.messages as Array<{ role: string; content: string }>;
    expect(messages[1].content).toContain('Japan');
  });

  it('skips language instruction for English', async () => {
    mockCreate.mockResolvedValueOnce({
      model: 'gpt-4.1-nano',
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Summary.',
              sentiment: 'neutral',
              rationale: 'OK.',
            }),
          },
        },
      ],
    });

    await analyzeArticle({ title: 'News', snippet: 'Text', lang: 'en' });

    const callArgs = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0] as Record<string, unknown>;
    const messages = callArgs.messages as Array<{ role: string; content: string }>;
    expect(messages[1].content).not.toContain('English');
  });
});
