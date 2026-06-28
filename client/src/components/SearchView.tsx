import { useState, useCallback, useEffect, useRef } from 'react';
import type { SearchResult } from '../lib/api';
import { searchArticles, analyzeArticle, fetchTrending, safeUrl } from '../lib/api';
import { useT } from '../lib/i18n';
import { sentimentEmoji, sentimentLabelKey } from '../lib/sentiment';
import './SearchView.css';

interface Props {
  analyzedUrls: Set<string>;
  onAnalyzed: (url: string) => void;
  visible: boolean;
  lang: string;
  country: string;
}

export function SearchView({ analyzedUrls, onAnalyzed, visible, lang, country }: Props) {
  const t = useT();

  const CATEGORY_KEYS = [
    'categories.world',
    'categories.ai',
    'categories.politics',
    'categories.technology',
    'categories.sports',
    'categories.business',
    'categories.health',
    'categories.science',
  ];

  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [analyzingUrls, setAnalyzingUrls] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [analyzedResults, setAnalyzedResults] = useState<Record<string, { summary: string; sentiment: string; rationale: string }>>({});

  const searchGenRef = useRef(0);

  const doSearch = useCallback(
    async (q: string) => {
      const gen = ++searchGenRef.current;
      setSearching(true);
      setError('');
      setArticles([]);
      setSearched(true);
      setQuery(q);
      setActiveCategory(null);

      try {
        const results = await searchArticles(q, lang || undefined, country || undefined);
        if (gen !== searchGenRef.current) return;
        setArticles(results);
        if (results.length === 0) {
          setError(t('search.error.notFound'));
        }
      } catch {
        if (gen !== searchGenRef.current) return;
        setError(t('search.error.failed'));
      } finally {
        if (gen === searchGenRef.current) {
          setSearching(false);
        }
      }
    },
    [lang, country, t]
  );

  const doTrending = useCallback(async () => {
    const gen = ++searchGenRef.current;
    setSearching(true);
    setError('');
    setArticles([]);
    setSearched(true);
    setQuery('');
    setActiveCategory('trending');

    try {
      const results = await fetchTrending(lang || undefined, country || undefined);
      if (gen !== searchGenRef.current) return;
      setArticles(results);
      if (results.length === 0) {
        setError(t('search.error.notFound'));
      }
    } catch {
      if (gen !== searchGenRef.current) return;
      setError(t('search.error.failed'));
    } finally {
      if (gen === searchGenRef.current) {
        setSearching(false);
      }
    }
  }, [lang, country, t]);

  const loadedRef = useRef(false);
  const prevLang = useRef(lang);
  const prevCountry = useRef(country);

  useEffect(() => {
    if (!visible) return;

    const localeChanged = lang !== prevLang.current || country !== prevCountry.current;
    prevLang.current = lang;
    prevCountry.current = country;

    if (!loadedRef.current || localeChanged) {
      loadedRef.current = true;
      doTrending();
    }
  }, [doTrending, lang, country, visible]);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;
      doSearch(q);
    },
    [query, doSearch]
  );

  const handleCategory = useCallback(
    (categoryKey: string) => {
      const searchQuery = t(categoryKey);
      setQuery(searchQuery);
      setActiveCategory(categoryKey);
      doSearch(searchQuery);
    },
    [doSearch, t]
  );

  const handleAnalyze = useCallback(
    async (article: SearchResult) => {
      setAnalyzingUrls((prev) => new Set(prev).add(article.url));
      try {
        const result = await analyzeArticle({
          url: article.url,
          title: article.title,
          source: article.source,
          publishedAt: article.publishedAt,
          snippet: article.snippet,
          imageUrl: article.imageUrl,
          language: lang || undefined,
          country: country || undefined,
        });
        setAnalyzedResults((prev) => ({
          ...prev,
          [article.url]: {
            summary: result.summary,
            sentiment: result.sentiment,
            rationale: result.rationale,
          },
        }));
        onAnalyzed(article.url);
      } catch {
        setError(t('search.error.analyze'));
      } finally {
        setAnalyzingUrls((prev) => {
          const next = new Set(prev);
          next.delete(article.url);
          return next;
        });
      }
    },
    [onAnalyzed, lang, country, t]
  );

  const formatDate = (iso: string, locale: string = 'en') => {
    return new Date(iso).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="search-view" style={{ display: visible ? undefined : 'none' }}>
      <form className="search-form" onSubmit={handleSearch}>
        <input
          className="search-input"
          type="text"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={searching}
        />
        <button className="search-btn" type="submit" disabled={searching || !query.trim()}>
          {searching ? <span className="spinner-sm" /> : null}
          {searching ? t('search.searching') : t('search.btn')}
        </button>
      </form>

      <div className="categories">
        <button
          className={`category-chip trending-chip${activeCategory === 'trending' ? ' active' : ''}`}
          onClick={doTrending}
          disabled={searching}
        >
          {t('categories.trending')}
        </button>
        {CATEGORY_KEYS.map((key) => (
          <button
            key={key}
            className={`category-chip${activeCategory === key ? ' active' : ''}`}
            onClick={() => handleCategory(key)}
            disabled={searching}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {error && <div className="search-error">{error}</div>}

      {searching && (
        <div className="search-status">{t('search.status.searching')}</div>
      )}

      {!searching && searched && articles.length === 0 && !error && (
        <div className="search-status">{t('search.status.empty')}</div>
      )}

      {articles.length > 0 && (
        <>
          <div className="results-label">
            {t('search.results')} ({articles.length})
          </div>
          {articles.map((article) => {
            const isAnalyzed = analyzedUrls.has(article.url);
            const isAnalyzing = analyzingUrls.has(article.url);
            const analysis = analyzedResults[article.url];

            return (
              <div key={article.url}>
                <div
                  className={`article-card${isAnalyzed ? ' analyzed' : ''}`}
                >
                  {article.imageUrl && (
                    <div className="article-image-wrap">
                      <img
                        className="article-image"
                        src={article.imageUrl}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="article-body">
                    <div className="article-source">{article.source}</div>
                    <a
                      className="article-title-link"
                      href={safeUrl(article.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {article.title}
                    </a>
                    {article.snippet && (
                      <div className="article-snippet">{article.snippet}</div>
                    )}
                    <div className="article-meta">
                      <span>{formatDate(article.publishedAt, lang)}</span>
                      <a
                        className="article-external-link"
                        href={safeUrl(article.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('search.readOriginal')} ↗
                      </a>
                    </div>
                  </div>
                  <button
                    className={`analyze-btn${isAnalyzing ? ' analyzing' : ''}`}
                    onClick={() => handleAnalyze(article)}
                    disabled={isAnalyzed || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <><span className="spinner-sm" /> {t('search.analyzing')}</>
                    ) : isAnalyzed ? (
                      t('search.analyzed')
                    ) : (
                      t('search.analyze')
                    )}
                  </button>
                </div>
                {isAnalyzing && !analysis && (
                  <div className="analysis-loading">
                    <span className="spinner-sm" />
                    {' '}{t('search.analyzing')}...
                  </div>
                )}
                {analysis && (
                  <div className="analysis-inline">
                    <span className={`analysis-sentiment ${analysis.sentiment}`}>
                      {sentimentEmoji(analysis.sentiment)}{' '}
                      {t(sentimentLabelKey(analysis.sentiment))}
                    </span>
                    <div className="analysis-summary">{analysis.summary}</div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
