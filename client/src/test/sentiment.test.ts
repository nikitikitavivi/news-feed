import { describe, it, expect } from 'vitest';
import { sentimentEmoji, sentimentLabelKey } from '../lib/sentiment';

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
