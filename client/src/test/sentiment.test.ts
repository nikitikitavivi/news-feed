import { describe, it, expect } from 'vitest';

function sentimentEmoji(s: string): string {
  switch (s) {
    case 'positive': return '😍';
    case 'negative': return '😢';
    default: return '👀';
  }
}

function sentimentLabelKey(s: string): string {
  switch (s) {
    case 'positive': return 'history.positive';
    case 'negative': return 'history.negative';
    default: return 'history.neutral';
  }
}

describe('sentiment helpers', () => {
  describe('sentimentEmoji', () => {
    it('returns heart-eyes emoji for positive', () => {
      expect(sentimentEmoji('positive')).toBe('😍');
    });

    it('returns crying emoji for negative', () => {
      expect(sentimentEmoji('negative')).toBe('😢');
    });

    it('returns eyes emoji for neutral', () => {
      expect(sentimentEmoji('neutral')).toBe('👀');
    });

    it('returns eyes emoji for unknown values', () => {
      expect(sentimentEmoji('unknown')).toBe('👀');
      expect(sentimentEmoji('')).toBe('👀');
    });
  });

  describe('sentimentLabelKey', () => {
    it('maps positive to history.positive', () => {
      expect(sentimentLabelKey('positive')).toBe('history.positive');
    });

    it('maps negative to history.negative', () => {
      expect(sentimentLabelKey('negative')).toBe('history.negative');
    });

    it('maps neutral to history.neutral', () => {
      expect(sentimentLabelKey('neutral')).toBe('history.neutral');
    });

    it('maps unknown to history.neutral as default', () => {
      expect(sentimentLabelKey('unknown')).toBe('history.neutral');
    });
  });
});
