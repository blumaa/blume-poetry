import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import AdminSubscribersPage from '@/app/admin/subscribers/page';
import type { Subscriber } from '@/lib/supabase/types';

/* The real modal posts to the API; here only the success callback matters. */
jest.mock('@/components/SubscribeModal', () => ({
  SubscribeModal: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: () => void }) =>
    isOpen ? <button onClick={onSuccess}>Mock add success</button> : null,
}));

const listResults: Array<{ data: Subscriber[]; error: null }> = [];

function makeListQuery() {
  const result = listResults.shift() ?? { data: [], error: null };
  const query = Promise.resolve(result) as Promise<typeof result> & { eq: () => unknown };
  query.eq = () => query;
  return query;
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ order: () => makeListQuery() }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  }),
}));

const subscriber = (id: string, email: string): Subscriber => ({
  id,
  email,
  status: 'active',
  subscribed_at: '2026-01-01T00:00:00.000Z',
  verified: true,
  notify_new_poems: true,
} as Subscriber);

describe('AdminSubscribersPage', () => {
  beforeEach(() => {
    listResults.length = 0;
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
});
