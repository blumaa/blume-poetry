import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import AdminSubscribersPage from '@/app/admin/subscribers/page';
import type { SubscriberRow } from '@/lib/supabase/types';
import { queryKeys } from '@/lib/queryKeys';

/* The real modal posts to the API; here only the success callback matters. */
jest.mock('@/features/subscribers/SubscribeModal', () => ({
  SubscribeModal: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: () => void }) =>
    isOpen ? <button onClick={onSuccess}>Mock add success</button> : null,
}));

const listResults: Array<{ data?: SubscriberRow[]; error?: { message: string } | null }> = [];

// Every query takes the next queued result; list reads are the only ones awaited here.
jest.mock('@/lib/supabase/client', () => {
  const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
  return { createClient: () => ({ from: () => queryMock(listResults.shift() ?? { data: [] }) }) };
});

const subscriber = (id: string, email: string): SubscriberRow => ({
  id,
  email,
  status: 'active',
  subscribed_at: '2026-01-01T00:00:00.000Z',
  verified: true,
  notify_new_poems: true,
} as SubscriberRow);

describe('AdminSubscribersPage', () => {
  beforeEach(() => {
    listResults.length = 0;
  });

  it('says so when subscribers fail to load, rather than showing an empty list', async () => {
    listResults.push({ error: { message: 'connection lost' } });
    renderWithProviders(<AdminSubscribersPage />);

    expect(await screen.findByText('Failed to load subscribers')).toBeInTheDocument();
    expect(screen.queryByText('No subscribers found.')).not.toBeInTheDocument();
  });

  it('shows subscribers from the server', async () => {
    listResults.push({ data: [subscriber('s1', 'a@example.com')], error: null });
    renderWithProviders(<AdminSubscribersPage />);

    expect(await screen.findByText('a@example.com')).toBeInTheDocument();
  });

  it('shows an added subscriber only after the refetch', async () => {
    listResults.push(
      { data: [subscriber('s1', 'a@example.com')], error: null }, // initial
      { data: [subscriber('s1', 'a@example.com'), subscriber('s2', 'b@example.com')], error: null } // after add
    );
    renderWithProviders(<AdminSubscribersPage />);
    const user = userEvent.setup();

    await screen.findByText('a@example.com');
    await user.click(screen.getByLabelText('Add subscriber'));
    await user.click(screen.getByText('Mock add success'));

    expect(await screen.findByText('b@example.com')).toBeInTheDocument();
  });

  /* Every admin view derived from subscribers (dashboard count, send page)
     must go stale on a write, not only this list. */
  it('marks every admin read stale after a write', async () => {
    listResults.push({ data: [subscriber('s1', 'a@example.com')], error: null });
    const { queryClient } = renderWithProviders(<AdminSubscribersPage />);
    queryClient.setQueryData(queryKeys.admin.stats(), { poems: 1, subscribers: 1, drafts: 0, comments: 0 });
    const user = userEvent.setup();

    await screen.findByText('a@example.com');
    await user.click(screen.getByLabelText('Add subscriber'));
    await user.click(screen.getByText('Mock add success'));

    await waitFor(() =>
      expect(queryClient.getQueryState(queryKeys.admin.stats())?.isInvalidated).toBe(true)
    );
  });
});
