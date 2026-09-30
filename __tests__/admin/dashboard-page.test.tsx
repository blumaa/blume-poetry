import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import AdminDashboard from '@/app/admin/page';

// Count queries resolve in order: poems, active subscribers, drafts, comments.
const results: Array<{ count?: number; error?: { message: string } }> = [];

jest.mock('@/lib/supabase/client', () => {
  const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
  return { createClient: () => ({ from: () => queryMock(results.shift() ?? {}) }) };
});

beforeEach(() => {
  results.length = 0;
});

describe('AdminDashboard', () => {
  it('shows each count', async () => {
    results.push({ count: 12 }, { count: 30 }, { count: 2 }, { count: 7 });
    renderWithProviders(<AdminDashboard />);

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  /* Zeros would read as real numbers. */
  it('says so when a count fails, rather than showing zero', async () => {
    results.push({ count: 12 }, { error: { message: 'connection lost' } }, { count: 2 }, { count: 7 });
    renderWithProviders(<AdminDashboard />);

    expect(await screen.findByText('Failed to load stats')).toBeInTheDocument();
    expect(screen.queryByText('Subscribers')).not.toBeInTheDocument();
  });
});
