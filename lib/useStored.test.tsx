import { act, render, screen } from '@testing-library/react';
import { useStored } from './useStored';
import { writeStored } from './browserStorage';

beforeEach(() => localStorage.clear());

function Reader({ label }: { label: string }) {
  const value = useStored('notificationsCleared');
  return <p>{`${label}:${value ?? 'none'}`}</p>;
}

describe('useStored', () => {
  it('keeps every reader of a key on the same value', () => {
    render(
      <>
        <Reader label="desktop" />
        <Reader label="mobile" />
      </>
    );
    expect(screen.getByText('desktop:none')).toBeInTheDocument();

    act(() => writeStored('notificationsCleared', '2026-01-01'));

    expect(screen.getByText('desktop:2026-01-01')).toBeInTheDocument();
    expect(screen.getByText('mobile:2026-01-01')).toBeInTheDocument();
  });
});
