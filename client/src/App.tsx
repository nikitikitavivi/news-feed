import { useState, useCallback, useEffect, useMemo } from 'react';
import { LocaleProvider, useT, type SupportedLang } from './lib/i18n';
import { detectBrowserLang, detectBrowserCountry } from './lib/geoOptions';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LocalePicker } from './components/LocalePicker';
import { SearchView } from './components/SearchView';
import { HistoryView } from './components/HistoryView';
import './App.css';

const ROTATING_EMOJIS = ['📰', '📊', '📈', '🌍', '🤖', '💡', '🔬', '🗞️', '📡', '⚡'];

function RotatingEmoji() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ROTATING_EMOJIS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="rotating-emoji" key={index}>
      {ROTATING_EMOJIS[index]}
    </span>
  );
}

const LANG_TO_UI: Record<string, SupportedLang> = {
  en: 'en', ru: 'ru', es: 'es', fr: 'fr', de: 'de', zh: 'zh', ja: 'ja', ar: 'ar',
};

export default function App() {
  const [analyzedUrls, setAnalyzedUrls] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');

  const defaultLang = useMemo(() => {
    const saved = localStorage.getItem('newsfeed-lang');
    return saved || detectBrowserLang() || 'en';
  }, []);
  const defaultCountry = useMemo(() => {
    const saved = localStorage.getItem('newsfeed-country');
    return saved || detectBrowserCountry() || 'gb';
  }, []);

  const [lang, setLang] = useState(defaultLang);
  const [country, setCountry] = useState(defaultCountry);

  const handleLangChange = useCallback((code: string) => {
    setLang(code);
    localStorage.setItem('newsfeed-lang', code);
  }, []);

  const handleCountryChange = useCallback((code: string) => {
    setCountry(code);
    localStorage.setItem('newsfeed-country', code);
  }, []);

  const handleAnalyzed = useCallback((url: string) => {
    setRefreshKey((k) => k + 1);
    setAnalyzedUrls((prev) => new Set(prev).add(url));
  }, []);

  const uiLang: SupportedLang = LANG_TO_UI[lang] || 'en';

  return (
    <LocaleProvider lang={uiLang}>
      <Inner
        lang={lang}
        country={country}
        activeTab={activeTab}
        analyzedUrls={analyzedUrls}
        refreshKey={refreshKey}
        onLangChange={handleLangChange}
        onCountryChange={handleCountryChange}
        onTabChange={setActiveTab}
        onAnalyzed={handleAnalyzed}
      />
    </LocaleProvider>
  );
}

function Inner({
  lang, country, activeTab, analyzedUrls, refreshKey,
  onLangChange, onCountryChange, onTabChange, onAnalyzed,
}: {
  lang: string;
  country: string;
  activeTab: 'search' | 'history';
  analyzedUrls: Set<string>;
  refreshKey: number;
  onLangChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onTabChange: (v: 'search' | 'history') => void;
  onAnalyzed: (url: string) => void;
}) {
  const t = useT();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-logo">
            <RotatingEmoji />
            <span>Sentimental News</span>
          </h1>
          <p className="app-subtitle">{t('header.subtitle')}</p>
        </div>
        <LocalePicker
          lang={lang}
          country={country}
          disabled={false}
          onLangChange={onLangChange}
          onCountryChange={onCountryChange}
        />
      </header>

      <nav className="tabs">
        <button
          className={`tab${activeTab === 'search' ? ' active' : ''}`}
          onClick={() => onTabChange('search')}
        >
          {t('tabs.search')}
        </button>
        <button
          className={`tab${activeTab === 'history' ? ' active' : ''}`}
          onClick={() => onTabChange('history')}
        >
          {t('tabs.history')}
        </button>
      </nav>

      <main className="app-main">
        <ErrorBoundary>
          <SearchView
            analyzedUrls={analyzedUrls}
            onAnalyzed={onAnalyzed}
            visible={activeTab === 'search'}
            lang={lang}
            country={country}
          />
          <HistoryView refreshKey={refreshKey} visible={activeTab === 'history'} />
        </ErrorBoundary>
      </main>

      <footer className="app-footer">
        <span>{t('footer.gnews')}</span>
        <span>{t('footer.ai')}</span>
      </footer>
    </div>
  );
}
