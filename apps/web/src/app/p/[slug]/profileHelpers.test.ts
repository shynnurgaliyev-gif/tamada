import { describe, expect, it } from 'vitest';
import {
  buildTimelineSegments,
  calendarDaysEqual,
  calendarEntriesEqual,
  dayBounds,
  formatMinutes,
  isAllDayEntry,
  nameToGradient,
  rangeTouchesDate,
  rangeTouchesMonth,
  type PublicCalendarEntry,
} from './profileHelpers';

describe('nameToGradient', () => {
  it('is deterministic for same input', () => {
    expect(nameToGradient('Alice')).toBe(nameToGradient('Alice'));
  });

  it('returns one of the predefined gradients', () => {
    const result = nameToGradient('any name');
    expect(result.startsWith('linear-gradient(135deg,')).toBe(true);
  });

  it('handles empty string', () => {
    expect(typeof nameToGradient('')).toBe('string');
  });

  it('different names usually produce different gradients', () => {
    const samples = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
      .map(n => nameToGradient(n));
    expect(new Set(samples).size).toBeGreaterThan(1);
  });
});

describe('formatMinutes', () => {
  it('formats simple values', () => {
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(60)).toBe('01:00');
    expect(formatMinutes(135)).toBe('02:15');
    expect(formatMinutes(1439)).toBe('23:59');
  });

  it('clamps below 0 to 00:00', () => {
    expect(formatMinutes(-10)).toBe('00:00');
  });

  it('clamps above 1440 to 24:00', () => {
    expect(formatMinutes(2000)).toBe('24:00');
    expect(formatMinutes(1440)).toBe('24:00');
  });
});

describe('calendarDaysEqual', () => {
  it('treats identical arrays as equal', () => {
    const a = [{ date: '2026-05-05', status: 'free' as const, count: 0 }];
    const b = [{ date: '2026-05-05', status: 'free' as const, count: 0 }];
    expect(calendarDaysEqual(a, b)).toBe(true);
  });

  it('detects length mismatch', () => {
    expect(calendarDaysEqual([], [{ date: 'x', status: 'free', count: 0 }])).toBe(false);
  });

  it('detects status mismatch', () => {
    const a = [{ date: 'x', status: 'free' as const, count: 0 }];
    const b = [{ date: 'x', status: 'busy' as const, count: 0 }];
    expect(calendarDaysEqual(a, b)).toBe(false);
  });
});

describe('calendarEntriesEqual', () => {
  const entry = (over: Partial<PublicCalendarEntry>): PublicCalendarEntry => ({
    id: '1', starts_at: '2026-05-05T10:00:00Z', ends_at: '2026-05-05T11:00:00Z', status: 'busy',
    ...over,
  });

  it('equal when ids and times match', () => {
    expect(calendarEntriesEqual([entry({})], [entry({})])).toBe(true);
  });

  it('different id breaks equality', () => {
    expect(calendarEntriesEqual([entry({})], [entry({ id: '2' })])).toBe(false);
  });

  it('different status breaks equality', () => {
    expect(calendarEntriesEqual([entry({})], [entry({ status: 'free' })])).toBe(false);
  });
});

describe('dayBounds', () => {
  it('produces 24h interval', () => {
    const { start, end } = dayBounds('2026-05-05');
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('returns ISO from/to', () => {
    const { from, to } = dayBounds('2026-05-05');
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('rangeTouchesMonth', () => {
  it('returns true when range falls inside the month', () => {
    expect(rangeTouchesMonth(
      { starts_at: '2026-05-10T00:00:00Z', ends_at: '2026-05-12T00:00:00Z' },
      2026, 5,
    )).toBe(true);
  });

  it('returns false when range is in another month', () => {
    expect(rangeTouchesMonth(
      { starts_at: '2026-04-10T00:00:00Z', ends_at: '2026-04-12T00:00:00Z' },
      2026, 5,
    )).toBe(false);
  });

  it('returns true when range straddles month boundary', () => {
    expect(rangeTouchesMonth(
      { starts_at: '2026-04-30T00:00:00Z', ends_at: '2026-05-02T00:00:00Z' },
      2026, 5,
    )).toBe(true);
  });

  it('returns true on invalid dates (defensive)', () => {
    expect(rangeTouchesMonth({ starts_at: 'bad', ends_at: 'also-bad' }, 2026, 5)).toBe(true);
  });
});

describe('rangeTouchesDate', () => {
  it('returns true if entry overlaps the day', () => {
    expect(rangeTouchesDate(
      { starts_at: '2026-05-05T10:00:00', ends_at: '2026-05-05T12:00:00' },
      '2026-05-05',
    )).toBe(true);
  });

  it('returns false for adjacent day', () => {
    expect(rangeTouchesDate(
      { starts_at: '2026-05-05T10:00:00', ends_at: '2026-05-05T12:00:00' },
      '2026-05-06',
    )).toBe(false);
  });
});

describe('isAllDayEntry', () => {
  const entry = (starts: string, ends: string): PublicCalendarEntry => ({
    id: '1', starts_at: starts, ends_at: ends, status: 'busy',
  });

  it('true when entry covers full day', () => {
    expect(isAllDayEntry(entry('2026-05-05T00:00:00', '2026-05-06T00:00:00'), '2026-05-05')).toBe(true);
  });

  it('false for short slot', () => {
    expect(isAllDayEntry(entry('2026-05-05T10:00:00', '2026-05-05T11:00:00'), '2026-05-05')).toBe(false);
  });
});

describe('buildTimelineSegments', () => {
  const entry = (id: string, starts: string, ends: string, status: PublicCalendarEntry['status'] = 'busy'): PublicCalendarEntry =>
    ({ id, starts_at: starts, ends_at: ends, status });

  it('returns single free 24h segment when no entries', () => {
    const segs = buildTimelineSegments([], '2026-05-05');
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ status: 'free', fromMin: 0, toMin: 1440 });
  });

  it('skips all-day entries', () => {
    const segs = buildTimelineSegments(
      [entry('1', '2026-05-05T00:00:00', '2026-05-06T00:00:00')],
      '2026-05-05',
    );
    expect(segs).toHaveLength(1);
    expect(segs[0]?.status).toBe('free');
  });

  it('inserts busy slot and surrounding free segments', () => {
    const segs = buildTimelineSegments(
      [entry('1', '2026-05-05T10:00:00', '2026-05-05T12:00:00')],
      '2026-05-05',
    );
    // expect: free[0..600], busy[600..720], free[720..1440]
    expect(segs).toHaveLength(3);
    expect(segs[0]).toMatchObject({ status: 'free', fromMin: 0, toMin: 600 });
    expect(segs[1]).toMatchObject({ status: 'busy', fromMin: 600, toMin: 720, key: '1' });
    expect(segs[2]).toMatchObject({ status: 'free', fromMin: 720, toMin: 1440 });
  });

  it('drops segments shorter than 15 minutes', () => {
    const segs = buildTimelineSegments(
      [entry('1', '2026-05-05T10:00:00', '2026-05-05T10:10:00')],
      '2026-05-05',
    );
    expect(segs.find(s => s.key === '1')).toBeUndefined();
  });

  it('clips entries that extend past midnight', () => {
    const segs = buildTimelineSegments(
      [entry('1', '2026-05-05T22:00:00', '2026-05-06T02:00:00')],
      '2026-05-05',
    );
    const busy = segs.find(s => s.key === '1');
    expect(busy?.toMin).toBe(1440);
  });
});
