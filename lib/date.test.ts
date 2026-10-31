import { formatDate, formatMonthYear, formatRelative } from './date';

const NOW = new Date('2026-09-30T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe('formatRelative', () => {
  it.each([
    [ago(30_000), 'just now'],
    [ago(5 * 60_000), '5m ago'],
    [ago(3 * 3_600_000), '3h ago'],
    [ago(2 * 86_400_000), '2d ago'],
  ])('%s -> %s', (input, expected) => {
    expect(formatRelative(input, NOW)).toBe(expected);
  });

  it('falls back to the shared date format after a week', () => {
    const old = ago(10 * 86_400_000);
    expect(formatRelative(old, NOW)).toBe(formatDate(old));
  });
});

describe('formatMonthYear', () => {
  it('names the month and year of a calendar date', () => {
    expect(formatMonthYear('2024-12-01')).toBe('December 2024');
  });

  /* A date column has no time zone. Read in Berlin, midnight UTC on the 1st
     would still be the 1st, but the month must not depend on that. */
  it('reads the date as written, whatever the time zone', () => {
    expect(formatMonthYear('2025-01-31')).toBe('January 2025');
  });
});
