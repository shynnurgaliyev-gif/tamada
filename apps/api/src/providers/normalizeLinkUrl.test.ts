import { describe, it, expect } from 'vitest';
import { normalizeLinkUrl } from './normalizeLinkUrl';

describe('normalizeLinkUrl', () => {
  describe('valid input', () => {
    it('accepts a clean https URL', () => {
      const r = normalizeLinkUrl('https://2gis.kz/petropavlovsk/geo/70000001094673857');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe('https://2gis.kz/petropavlovsk/geo/70000001094673857');
    });

    it('accepts a clean http URL', () => {
      const r = normalizeLinkUrl('http://example.com/path');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe('http://example.com/path');
    });

    it('adds https:// when scheme is missing', () => {
      const r = normalizeLinkUrl('2gis.kz/petropavlovsk/geo/123');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe('https://2gis.kz/petropavlovsk/geo/123');
    });

    it('trims outer whitespace', () => {
      const r = normalizeLinkUrl('  https://example.com  ');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe('https://example.com/');
    });

    it('accepts localhost for dev', () => {
      const r = normalizeLinkUrl('http://localhost:3000/health');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe('http://localhost:3000/health');
    });
  });

  describe('label-prefix paste recovery', () => {
    it('extracts URL when label is glued in front with a space', () => {
      const r = normalizeLinkUrl('Demokrat https://2gis.kz/petropavlovsk/geo/70000001094673857');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe('https://2gis.kz/petropavlovsk/geo/70000001094673857');
    });

    it('takes the LAST http(s):// fragment when multiple are present', () => {
      // This is the exact garbage shape produced by the previous blind-prefix bug.
      const r = normalizeLinkUrl('https://Demokrat https://2gis.kz/petropavlovsk/geo/70000001094673857');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe('https://2gis.kz/petropavlovsk/geo/70000001094673857');
    });

    it('handles multi-line paste from previews', () => {
      const r = normalizeLinkUrl('Demokrat\nhttps://2gis.kz/x');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe('https://2gis.kz/x');
    });
  });

  describe('trailing punctuation cleanup', () => {
    it('strips trailing closing parenthesis and period', () => {
      const r = normalizeLinkUrl('see https://example.com/x).');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe('https://example.com/x');
    });

    it('strips trailing comma', () => {
      const r = normalizeLinkUrl('https://example.com/x,');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.url).toBe('https://example.com/x');
    });
  });

  describe('rejection', () => {
    it('rejects empty string', () => {
      const r = normalizeLinkUrl('');
      expect(r.ok).toBe(false);
    });

    it('rejects whitespace-only', () => {
      const r = normalizeLinkUrl('   ');
      expect(r.ok).toBe(false);
    });

    it('rejects non-string input', () => {
      expect(normalizeLinkUrl(null).ok).toBe(false);
      expect(normalizeLinkUrl(undefined).ok).toBe(false);
      expect(normalizeLinkUrl(42).ok).toBe(false);
      expect(normalizeLinkUrl({}).ok).toBe(false);
    });

    it('rejects non-http(s) schemes (with ://)', () => {
      expect(normalizeLinkUrl('ftp://example.com').ok).toBe(false);
      // Schemes without :// (mailto:, tel:, javascript:) are not recognized as
      // schemes by SCHEME_RE → fall through to https:// prefix. Mostly fine
      // because the resulting URL parser then either rejects the result or
      // produces a benign https:// URL. Verified on javascript: which fails
      // URL parsing due to "(" in the would-be host.
      expect(normalizeLinkUrl('javascript:alert(1)').ok).toBe(false);
    });

    it('rejects bare token without dot or scheme', () => {
      const r = normalizeLinkUrl('justaword');
      expect(r.ok).toBe(false);
    });

    it('rejects label-only paste with no http(s):// substring and whitespace', () => {
      // No http(s):// to extract, falls through to whitespace check.
      const r = normalizeLinkUrl('two words');
      expect(r.ok).toBe(false);
    });
  });
});
