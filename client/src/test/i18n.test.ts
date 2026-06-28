import { describe, it, expect } from 'vitest';

const en: Record<string, string> = {
  'header.subtitle': 'Search news, get AI-powered summaries and sentiment analysis',
  'tabs.search': 'Search',
  'tabs.history': 'History',
  'search.placeholder': 'Search recent news...',
  'search.btn': 'Search',
  'search.searching': 'Searching',
  'search.status.searching': 'Searching latest news...',
  'search.status.empty': 'Enter a search term or pick a category above.',
  'search.error.notFound': 'No articles found. Try a different search term.',
  'search.error.failed': 'Search failed. Please try again.',
  'search.error.analyze': 'Analysis failed. Please try again.',
  'search.results': 'Results',
  'search.readOriginal': 'Read original',
  'search.analyze': 'Analyze',
  'search.analyzing': 'Analyzing',
  'search.analyzed': 'Analyzed',
  'categories.world': 'World',
  'categories.ai': 'AI',
  'categories.trending': '🔥 Trending',
  'categories.politics': 'Politics',
  'categories.technology': 'Technology',
  'categories.sports': 'Sports',
  'categories.business': 'Business',
  'categories.health': 'Health',
  'categories.science': 'Science',
  'history.title': 'Analysis History',
  'history.all': 'All',
  'history.positive': 'Good news',
  'history.neutral': 'Just another news',
  'history.negative': 'Bad news',
  'history.loading': 'Loading history...',
  'history.error': 'Failed to load history.',
  'history.empty': 'No analyses yet. Search and click "Analyze" to start.',
  'history.delete': 'Delete',
  'history.error.delete': 'Delete failed.',
  'history.original': 'Original article',
  'footer.gnews': 'News data via GNews API',
  'footer.ai': 'AI summaries via GPT-4.1 nano',
};

const ru: Record<string, string> = {
  'categories.trending': '\ud83d\udd25 \u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u043e\u0435',
  'history.positive': '\u0425\u043e\u0440\u043e\u0448\u0438\u0435 \u043d\u043e\u0432\u043e\u0441\u0442\u0438',
  'history.neutral': '\u041f\u0440\u043e\u0441\u0442\u043e \u043d\u043e\u0432\u043e\u0441\u0442\u0438',
  'history.negative': '\u041f\u043b\u043e\u0445\u0438\u0435 \u043d\u043e\u0432\u043e\u0441\u0442\u0438',
};

describe('i18n translations', () => {
  describe('English locale', () => {
    it('has all required search keys', () => {
      expect(en['search.placeholder']).toBe('Search recent news...');
      expect(en['search.error.notFound']).toBe('No articles found. Try a different search term.');
    });

    it('has trending category with emoji', () => {
      expect(en['categories.trending']).toBe('🔥 Trending');
    });

    it('has sentiment filter labels', () => {
      expect(en['history.positive']).toBe('Good news');
      expect(en['history.neutral']).toBe('Just another news');
      expect(en['history.negative']).toBe('Bad news');
    });

    it('has footer translations', () => {
      expect(en['footer.gnews']).toBeDefined();
      expect(en['footer.ai']).toBeDefined();
    });

    it('has delete keys', () => {
      expect(en['history.delete']).toBeDefined();
      expect(en['history.error.delete']).toBeDefined();
    });
  });

  describe('Russian locale', () => {
    it('has trending with Russian text and emoji', () => {
      expect(ru['categories.trending']).toContain('🔥');
      expect(ru['categories.trending']).toContain('\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u043e\u0435');
    });

    it('has Russian sentiment labels', () => {
      expect(ru['history.positive']).toBe('\u0425\u043e\u0440\u043e\u0448\u0438\u0435 \u043d\u043e\u0432\u043e\u0441\u0442\u0438');
      expect(ru['history.negative']).toBe('\u041f\u043b\u043e\u0445\u0438\u0435 \u043d\u043e\u0432\u043e\u0441\u0442\u0438');
    });
  });
});
