import { useState, useEffect, useCallback, useRef } from 'react';
import type { Analysis, AnalysesResponse } from '../lib/api';
import { getAnalyses, safeUrl } from '../lib/api';
import { useT } from '../lib/i18n';
import { sentimentEmoji } from '../lib/sentiment';
import './HistoryView.css';

interface Props {
  refreshKey: number;
  visible: boolean;
}

export function HistoryView({ refreshKey, visible }: Props) {
  const t = useT();
  const [data, setData] = useState<AnalysesResponse | null>(null);
  const [filter, setFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);
  const prevRefreshKey = useRef(refreshKey);
  const prevFilter = useRef(filter);
  const fetchGenRef = useRef(0);

  const fetchAnalyses = useCallback(async (currentFilter: string) => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await getAnalyses(currentFilter === 'all' ? undefined : currentFilter);
      if (gen !== fetchGenRef.current) return;
      setData(result);
    } catch {
      if (gen !== fetchGenRef.current) return;
      setError(t('history.error'));
    } finally {
      if (gen === fetchGenRef.current) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (!visible) return;
    if (!loadedRef.current || refreshKey !== prevRefreshKey.current || filter !== prevFilter.current) {
      prevRefreshKey.current = refreshKey;
      prevFilter.current = filter;
      loadedRef.current = true;
      fetchAnalyses(filter);
    }
  }, [visible, refreshKey, filter, fetchAnalyses]);

  const filters: { key: 'all' | 'positive' | 'neutral' | 'negative'; labelKey: string }[] = [
    { key: 'all', labelKey: 'history.all' },
    { key: 'positive', labelKey: 'history.positive' },
    { key: 'neutral', labelKey: 'history.neutral' },
    { key: 'negative', labelKey: 'history.negative' },
  ];

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="history-view" style={{ display: visible ? undefined : 'none' }}>
      <div className="history-header">
        <h2 className="history-title">{t('history.title')}</h2>
      </div>

      {data && (data.counts.positive > 0 || data.counts.neutral > 0 || data.counts.negative > 0) && (
        <div className="sentiment-counts">
          {filters.map(({ key, labelKey }) => (
            <button
              key={key}
              className={`count-chip${filter === key ? ' active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {t(labelKey)}
              {key !== 'all' && <span className="count-num">{data.counts[key]}</span>}
            </button>
          ))}
        </div>
      )}

      {error && <div className="history-error">{error}</div>}

      {loading && (
        <div className="history-loading">
          <span className="spinner" />
          {t('history.loading')}
        </div>
      )}

      {!loading && !error && (!data || data.analyses.length === 0) && (
        <div className="history-empty">
          <div className="empty-icon">📋</div>
          <p>{t('history.empty')}</p>
        </div>
      )}

      {!loading &&
        data &&
        data.analyses.map((analysis: Analysis) => (
          <div key={analysis.id} className="history-card">
            {analysis.article?.imageUrl && (
              <div className="history-image-wrap">
                <img
                  className="history-image"
                  src={analysis.article.imageUrl}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="history-card-body">
              <div className="history-card-header">
                <a
                  className="history-article-title"
                  href={safeUrl(analysis.article?.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {analysis.article?.title ?? 'Unknown'}
                </a>
                <span className={`sentiment-tag ${analysis.sentiment}`}>
                  {sentimentEmoji(analysis.sentiment)}
                </span>
              </div>
              <div className="history-summary">{analysis.summary}</div>
              <div className="history-meta">
                <span>{analysis.article?.source}</span>
                <span>{formatDate(analysis.createdAt)}</span>
                <span>{analysis.model}</span>
                {analysis.article?.url && /^https?:\/\//i.test(analysis.article.url) && (
                  <a
                    className="history-source-link"
                    href={safeUrl(analysis.article.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('history.original')} ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}

    </div>
  );
}
