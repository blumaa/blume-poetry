import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import AdminPoemsPage from '@/app/admin/poems/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Each poems query resolves with whatever mockResult returns at the time.
const mockResult = jest.fn();

jest.mock('@/lib/supabase/client', () => {
  const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
  return { createClient: () => ({ from: () => queryMock(mockResult()) }) };
});

const poem = {
  id: 'p1',
  slug: 'autumn',
  title: 'Autumn',
  subtitle: null,
  content: '',
  plain_text: '',
  status: 'published',
  published_at: '2026-01-01T00:00:00.000Z',
  pinned: false,
};

beforeEach(() => {
  mockResult.mockReset();
  global.fetch = jest.fn();
});

describe('AdminPoemsPage', () => {
  it('says so when poems fail to load, rather than showing an empty list', async () => {
    mockResult.mockReturnValue({ error: { message: 'connection lost' } });
    renderWithProviders(<AdminPoemsPage />);

    expect(await screen.findByText('Failed to load poems')).toBeInTheDocument();
    expect(screen.queryByText(/No poems found/)).not.toBeInTheDocument();
  });

  it('reports a failed site refresh after a delete', async () => {
    mockResult.mockReturnValue({ data: [poem] });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Failed to revalidate' }),
    });
    const user = userEvent.setup();
    renderWithProviders(<AdminPoemsPage />);

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    // ConfirmDialog shows the rejection from the mutation.
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Failed to revalidate');
  });
});
