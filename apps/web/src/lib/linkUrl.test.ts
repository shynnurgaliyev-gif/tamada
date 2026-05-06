import { describe, expect, it } from 'vitest';
import { cleanPastedUrl, normalizeLinkUrl, safeLinkHref } from './linkUrl';

describe('normalizeLinkUrl', () => {
  it('rejects non-string input', () => {
    expect(normalizeLinkUrl(null)).toEqual({ ok: false, error: 'URL обязателен' });
    expect(normalizeLinkUrl(123)).toEqual({ ok: false, error: 'URL обязателен' });
  });

  it('rejects empty / whitespace', () => {
    expect(normalizeLinkUrl('')).toEqual({ ok: false, error: 'URL обязателен' });
    expect(normalizeLinkUrl('   ')).toEqual({ ok: false, error: 'URL обязателен' });
  });

  it('accepts a normal https URL', () => {
    const r = normalizeLinkUrl('https://example.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://example.com/');
  });

  it('prepends https:// when scheme is missing', () => {
    const r = normalizeLinkUrl('example.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://example.com/');
  });

  it('extracts the last http(s) fragment when input has a label prefix', () => {
    const r = normalizeLinkUrl('Visit https://example.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://example.com/');
  });

  it('keeps only the last URL when multiple are present', () => {
    const r = normalizeLinkUrl('https://a.com https://b.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://b.com/');
  });

  it('strips trailing punctuation', () => {
    const r = normalizeLinkUrl('https://example.com).');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe('https://example.com/');
  });

  it('rejects URLs containing inner whitespace', () => {
    expect(normalizeLinkUrl('foo bar')).toEqual({ ok: false, error: 'URL не должен содержать пробелы' });
  });

  it('rejects non-http(s) schemes', () => {
    expect(normalizeLinkUrl('ftp://example.com')).toEqual({ ok: false, error: 'Разрешены только http(s) ссылки' });
  });

  it('rejects hosts without a dot (except localhost)', () => {
    expect(normalizeLinkUrl('https://nohost')).toEqual({ ok: false, error: 'Некорректный домен' });
  });

  it('accepts localhost', () => {
    const r = normalizeLinkUrl('http://localhost:3000/path');
    expect(r.ok).toBe(true);
  });
});

describe('cleanPastedUrl', () => {
  it('returns trimmed input when no http fragment present', () => {
    expect(cleanPastedUrl('  example.com  ')).toBe('example.com');
  });

  it('extracts the last http fragment and strips trailing punctuation', () => {
    expect(cleanPastedUrl('Сайт: https://example.com).')).toBe('https://example.com');
  });

  it('returns empty string for empty input', () => {
    expect(cleanPastedUrl('   ')).toBe('');
  });
});

describe('safeLinkHref', () => {
  it('returns null for null / undefined / empty', () => {
    expect(safeLinkHref(null)).toBeNull();
    expect(safeLinkHref(undefined)).toBeNull();
    expect(safeLinkHref('')).toBeNull();
  });

  it('returns normalized URL for valid input', () => {
    expect(safeLinkHref('https://example.com')).toBe('https://example.com/');
  });

  it('returns null for garbage', () => {
    expect(safeLinkHref('ftp://example.com')).toBeNull();
  });
});
