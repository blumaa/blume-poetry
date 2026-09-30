import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import SendNewsletterPage from '@/app/admin/subscribers/send/page';

jest.mock('next/navigation', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/components/admin/RichTextEditor', () => ({ RichTextEditor: () => null }));

const results: Array<{ data?: unknown; count?: number; error?: { message: string } }> = [];

jest.mock('@/lib/supabase/client', () => {
  const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
  return { createClient: () => ({ from: () => queryMock(results.shift() ?? {}) }) };
});

beforeEach(() => {
  results.length = 0;
});

describe('SendNewsletterPage', () => {
  it('shows the active subscriber count', async () => {
    results.push({ data: [] }, { count: 3 });
    renderWithProviders(<SendNewsletterPage />);
    expect(await screen.findByRole('button', { name: 'Send to 3 Subscribers' })).toBeInTheDocument();
  });

  /* "Send to 0 Subscribers" would be a false statement about the list. */
  it('says so when the data fails to load', async () => {
    results.push({ data: [] }, { error: { message: 'connection lost' } });
    renderWithProviders(<SendNewsletterPage />);
    expect(await screen.findByText('Failed to load subscribers')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Send to/ })).not.toBeInTheDocument();
  });
});
