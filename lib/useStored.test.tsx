import { act, render, screen } from '@testing-library/react';
import { useStored } from './useStored';
import { writeStored } from './browserStorage';

beforeEach(() => localStorage.clear());

function Reader({ label }: { label: string }) {
  const value = useStored('sidebarCollapsed');
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

    act(() => writeStored('sidebarCollapsed', 'true'));

    expect(screen.getByText('desktop:true')).toBeInTheDocument();
    expect(screen.getByText('mobile:true')).toBeInTheDocument();
  });
});
