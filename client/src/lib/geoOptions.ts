export interface LocaleOption {
  code: string;
  flag: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: LocaleOption[] = [
  { code: '', flag: '🌐', name: 'Any language', nativeName: 'Any language' },
  { code: 'en', flag: '🇬🇧', name: 'English', nativeName: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Russian', nativeName: 'Русский' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'French', nativeName: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', flag: '🇨🇳', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese', nativeName: '日本語' },
  { code: 'ar', flag: '🇸🇦', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'pt', flag: '🇧🇷', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', flag: '🇮🇹', name: 'Italian', nativeName: 'Italiano' },
  { code: 'nl', flag: '🇳🇱', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', flag: '🇸🇪', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', flag: '🇳🇴', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'tr', flag: '🇹🇷', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', flag: '🇺🇦', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'el', flag: '🇬🇷', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'he', flag: '🇮🇱', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'id', flag: '🇮🇩', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ro', flag: '🇷🇴', name: 'Romanian', nativeName: 'Română' },
  { code: 'bn', flag: '🇧🇩', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ml', flag: '🇮🇳', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', flag: '🇮🇳', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'pa', flag: '🇮🇳', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ta', flag: '🇮🇳', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', flag: '🇮🇳', name: 'Telugu', nativeName: 'తెలుగు' },
];

export const COUNTRIES: LocaleOption[] = [
  { code: '', flag: '🌐', name: 'Any country', nativeName: 'Any country' },
  { code: 'us', flag: '🇺🇸', name: 'United States', nativeName: 'United States' },
  { code: 'gb', flag: '🇬🇧', name: 'United Kingdom', nativeName: 'United Kingdom' },
  { code: 'de', flag: '🇩🇪', name: 'Germany', nativeName: 'Deutschland' },
  { code: 'fr', flag: '🇫🇷', name: 'France', nativeName: 'France' },
  { code: 'ru', flag: '🇷🇺', name: 'Russia', nativeName: 'Россия' },
  { code: 'cn', flag: '🇨🇳', name: 'China', nativeName: '中国' },
  { code: 'jp', flag: '🇯🇵', name: 'Japan', nativeName: '日本' },
  { code: 'in', flag: '🇮🇳', name: 'India', nativeName: 'भारत' },
  { code: 'br', flag: '🇧🇷', name: 'Brazil', nativeName: 'Brasil' },
  { code: 'ca', flag: '🇨🇦', name: 'Canada', nativeName: 'Canada' },
  { code: 'au', flag: '🇦🇺', name: 'Australia', nativeName: 'Australia' },
  { code: 'it', flag: '🇮🇹', name: 'Italy', nativeName: 'Italia' },
  { code: 'es', flag: '🇪🇸', name: 'Spain', nativeName: 'España' },
  { code: 'mx', flag: '🇲🇽', name: 'Mexico', nativeName: 'México' },
  { code: 'ar', flag: '🇦🇷', name: 'Argentina', nativeName: 'Argentina' },
  { code: 'nl', flag: '🇳🇱', name: 'Netherlands', nativeName: 'Nederland' },
  { code: 'se', flag: '🇸🇪', name: 'Sweden', nativeName: 'Sverige' },
  { code: 'ch', flag: '🇨🇭', name: 'Switzerland', nativeName: 'Schweiz' },
  { code: 'tr', flag: '🇹🇷', name: 'Turkey', nativeName: 'Türkiye' },
  { code: 'ua', flag: '🇺🇦', name: 'Ukraine', nativeName: 'Україна' },
  { code: 'sg', flag: '🇸🇬', name: 'Singapore', nativeName: 'Singapore' },
  { code: 'hk', flag: '🇭🇰', name: 'Hong Kong', nativeName: '香港' },
  { code: 'tw', flag: '🇹🇼', name: 'Taiwan', nativeName: '台灣' },
  { code: 'id', flag: '🇮🇩', name: 'Indonesia', nativeName: 'Indonesia' },
  { code: 'my', flag: '🇲🇾', name: 'Malaysia', nativeName: 'Malaysia' },
  { code: 'ph', flag: '🇵🇭', name: 'Philippines', nativeName: 'Pilipinas' },
  { code: 'pk', flag: '🇵🇰', name: 'Pakistan', nativeName: 'پاکستان' },
  { code: 'bd', flag: '🇧🇩', name: 'Bangladesh', nativeName: 'বাংলাদেশ' },
  { code: 'eg', flag: '🇪🇬', name: 'Egypt', nativeName: 'مصر' },
  { code: 'co', flag: '🇨🇴', name: 'Colombia', nativeName: 'Colombia' },
  { code: 'pe', flag: '🇵🇪', name: 'Peru', nativeName: 'Perú' },
  { code: 'pt', flag: '🇵🇹', name: 'Portugal', nativeName: 'Portugal' },
  { code: 'gr', flag: '🇬🇷', name: 'Greece', nativeName: 'Ελλάδα' },
  { code: 'ie', flag: '🇮🇪', name: 'Ireland', nativeName: 'Ireland' },
  { code: 'il', flag: '🇮🇱', name: 'Israel', nativeName: 'ישראל' },
  { code: 'no', flag: '🇳🇴', name: 'Norway', nativeName: 'Norge' },
  { code: 'ro', flag: '🇷🇴', name: 'Romania', nativeName: 'România' },
];

const LANG_SET = new Set(LANGUAGES.map((l) => l.code));
const COUNTRY_SET = new Set(COUNTRIES.map((c) => c.code));

export function detectBrowserLang(): string {
  if (typeof navigator === 'undefined') return '';

  const browserLang = navigator.language || '';
  const primary = browserLang.split('-')[0].toLowerCase();
  if (LANG_SET.has(primary)) return primary;

  for (const lang of navigator.languages || []) {
    const code = lang.split('-')[0].toLowerCase();
    if (LANG_SET.has(code)) return code;
  }

  return '';
}

export function detectBrowserCountry(): string {
  if (typeof navigator === 'undefined') return '';

  const browserLang = navigator.language || '';
  const parts = browserLang.split('-');
  if (parts.length > 1) {
    const region = parts[1].toLowerCase();
    if (COUNTRY_SET.has(region)) return region;
  }

  for (const lang of navigator.languages || []) {
    const parts = lang.split('-');
    if (parts.length > 1) {
      const region = parts[1].toLowerCase();
      if (COUNTRY_SET.has(region)) return region;
    }
  }

  const tzRegion = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tzRegion) {
    const tzParts = tzRegion.split('/')[0];
    const tzMap: Record<string, string> = {
      America: 'us',
      Asia: 'in',
      Europe: 'gb',
      Australia: 'au',
      Africa: 'eg',
    };
    const mapped = tzMap[tzParts];
    if (mapped && COUNTRY_SET.has(mapped)) return mapped;
  }

  return '';
}
