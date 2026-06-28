import { describe, it, expect, afterEach } from 'vitest';
import { LANGUAGES, COUNTRIES, detectBrowserLang, detectBrowserCountry } from '../lib/geoOptions';

const nav = globalThis.navigator;

describe('geoOptions', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: nav,
      writable: true,
      configurable: true,
    });
  });

  function setNavigator(value: object | undefined) {
    Object.defineProperty(globalThis, 'navigator', {
      value,
      writable: true,
      configurable: true,
    });
  }

  describe('LANGUAGES', () => {
    it('has empty option as first entry', () => {
      expect(LANGUAGES[0].code).toBe('');
      expect(LANGUAGES[0].name).toBe('Any language');
    });

    it('contains English', () => {
      const en = LANGUAGES.find((l) => l.code === 'en');
      expect(en).toBeDefined();
      expect(en!.flag).toBe('🇬🇧');
      expect(en!.name).toBe('English');
    });

    it('contains common language codes', () => {
      const codes = LANGUAGES.map((l) => l.code);
      expect(codes).toContain('en');
      expect(codes).toContain('ru');
      expect(codes).toContain('zh');
      expect(codes).toContain('es');
    });

    it('every entry has code, flag, name, and nativeName', () => {
      for (const lang of LANGUAGES) {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('flag');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('nativeName');
      }
    });
  });

  describe('COUNTRIES', () => {
    it('has empty option as first entry', () => {
      expect(COUNTRIES[0].code).toBe('');
      expect(COUNTRIES[0].name).toBe('Any country');
    });

    it('contains GB and US', () => {
      const gb = COUNTRIES.find((c) => c.code === 'gb');
      const us = COUNTRIES.find((c) => c.code === 'us');
      expect(gb).toBeDefined();
      expect(us).toBeDefined();
    });
  });

  describe('detectBrowserLang', () => {
    it('returns empty string when navigator is undefined', () => {
      setNavigator(undefined);
      expect(detectBrowserLang()).toBe('');
    });

    it('returns English when browser language is en-US', () => {
      setNavigator({ language: 'en-US', languages: [] });
      expect(detectBrowserLang()).toBe('en');
    });

    it('falls back to languages array when primary is unsupported', () => {
      setNavigator({ language: 'xx', languages: ['ru-RU', 'en'] });
      expect(detectBrowserLang()).toBe('ru');
    });

    it('returns empty string when no supported language matches', () => {
      setNavigator({ language: 'xx', languages: ['yy', 'zz'] });
      expect(detectBrowserLang()).toBe('');
    });
  });

  describe('detectBrowserCountry', () => {
    it('returns empty string when navigator is undefined', () => {
      setNavigator(undefined);
      expect(detectBrowserCountry()).toBe('');
    });

    it('returns GB when browser locale is en-GB', () => {
      setNavigator({ language: 'en-GB', languages: [] });
      expect(detectBrowserCountry()).toBe('gb');
    });

    it('returns US when browser locale is en-US', () => {
      setNavigator({ language: 'en-US', languages: [] });
      expect(detectBrowserCountry()).toBe('us');
    });
  });
});
