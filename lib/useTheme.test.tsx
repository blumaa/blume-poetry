import { act, render, screen } from '@testing-library/react';
import { useTheme } from './useTheme';
import { readStored } from './browserStorage';

beforeEach(() => localStorage.clear());

function Probe({ label }: { label: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}>{`${label}:${theme}`}</button>
  );
}

describe('useTheme', () => {
  it('toggles once, persists, and every reader follows', () => {
    render(
      <>
        <Probe label="a" />
        <Probe label="b" />
      </>
    );
    expect(screen.getByText('a:light')).toBeInTheDocument();

    act(() => screen.getByText('a:light').click());

    expect(screen.getByText('a:dark')).toBeInTheDocument();
    expect(screen.getByText('b:dark')).toBeInTheDocument();
    expect(readStored('theme')).toBe('dark');
  });
});
