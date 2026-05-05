import { describe, expect, it } from 'vitest';
import { toSlug } from './slug';

describe('toSlug', () => {
  it('transliterates basic Cyrillic', () => {
    expect(toSlug('Алия')).toBe('aliya');
    expect(toSlug('Тамада')).toBe('tamada');
  });

  it('handles Kazakh-specific letters', () => {
    expect(toSlug('Әлем')).toBe('alem');
    expect(toSlug('Қазақ')).toBe('kazak');
    expect(toSlug('Өңір')).toBe('onir');
    expect(toSlug('Үміт')).toBe('umit');
  });

  it('replaces spaces and punctuation with single dash', () => {
    expect(toSlug('Тамада & DJ')).toBe('tamada-dj');
    expect(toSlug('Имя — Фамилия')).toBe('imya-familiya');
  });

  it('collapses multiple dashes', () => {
    expect(toSlug('a---b')).toBe('a-b');
    expect(toSlug('!!!hello!!!')).toBe('hello');
  });

  it('trims leading and trailing dashes', () => {
    expect(toSlug('-test-')).toBe('test');
  });

  it('preserves Latin letters and digits', () => {
    expect(toSlug('Profile-2025')).toBe('profile-2025');
  });

  it('drops soft and hard signs', () => {
    expect(toSlug('Подъезд')).toBe('podezd');
    expect(toSlug('Семья')).toBe('semya');
  });

  it('lowercases everything', () => {
    expect(toSlug('ALICE')).toBe('alice');
  });

  it('limits length to 50 characters', () => {
    const long = 'a'.repeat(100);
    expect(toSlug(long)).toHaveLength(50);
  });

  it('returns empty string for purely non-letter input', () => {
    expect(toSlug('!!!')).toBe('');
  });
});
