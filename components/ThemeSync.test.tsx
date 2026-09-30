import { act, render } from '@testing-library/react';
import { ThemeSync } from './ThemeSync';
import { writeStored } from '@/lib/browserStorage';

beforeEach(() => localStorage.clear());

describe('ThemeSync', () => {
  it('mirrors the resolved theme onto <html data-theme>', () => {
    render(<ThemeSync />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    act(() => writeStored('theme', 'dark'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
