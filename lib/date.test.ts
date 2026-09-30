import { formatDate, formatRelative } from './date';

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
