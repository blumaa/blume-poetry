import { resolveTheme, themeBootScript } from './theme';
import { STORAGE_KEYS } from './browserStorage';

describe('resolveTheme', () => {
  it('prefers the stored choice', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('falls back to the system preference when nothing valid is stored', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme('purple', false)).toBe('light');
  });
});

describe('themeBootScript', () => {
  it('reads the registered storage name, not a copy of it', () => {
    expect(themeBootScript).toContain(JSON.stringify(STORAGE_KEYS.theme.name));
  });
});
