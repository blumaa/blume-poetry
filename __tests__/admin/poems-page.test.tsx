import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import AdminPoemsPage from '@/app/admin/poems/page';

import type { QueryMock } from '@/__tests__/supabaseMock';

const mockPush = jest.fn();
let mockParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockParams,
}));

// Each poems query resolves with whatever mockResult returns at the time.
const mockResult = jest.fn();
const mockQueries: QueryMock[] = [];

jest.mock('@/lib/supabase/client', () => {
  const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
  return {
    createClient: () => ({
      from: () => {
        const query = queryMock(mockResult());
        mockQueries.push(query);
        return query;
      },
    }),
  };
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
  collection: 'main',
};

beforeEach(() => {
  mockResult.mockReset();
  mockPush.mockReset();
  mockQueries.length = 0;
  mockParams = new URLSearchParams();
  global.fetch = jest.fn();
});

describe('AdminPoemsPage', () => {
  it('lists main poems unless the URL names another collection', async () => {
    mockResult.mockReturnValue({ data: [poem] });
    renderWithProviders(<AdminPoemsPage />);

    expect(await screen.findByRole('radio', { name: 'Main' })).toBeChecked();
    await screen.findByText('Autumn');
    expect(mockQueries[0].argsOf('eq')).toEqual([['collection', 'main']]);
  });

  it('lists the collection the URL names', async () => {
    mockParams = new URLSearchParams('collection=kinky&status=draft');
    mockResult.mockReturnValue({ data: [] });
    renderWithProviders(<AdminPoemsPage />);

    expect(await screen.findByRole('radio', { name: 'Kinky' })).toBeChecked();
    await screen.findByText(/No poems found/);
    expect(mockQueries[0].argsOf('eq')).toEqual([
      ['collection', 'kinky'],
      ['status', 'draft'],
    ]);
  });

  it('switches collection and keeps the status filter', async () => {
    mockParams = new URLSearchParams('status=draft');
    mockResult.mockReturnValue({ data: [] });
    const user = userEvent.setup();
    renderWithProviders(<AdminPoemsPage />);

    await user.click(await screen.findByRole('radio', { name: 'Kinky' }));
    expect(mockPush).toHaveBeenCalledWith('/admin/poems?collection=kinky&status=draft');
  });

  it('switches status and keeps the collection', async () => {
    mockParams = new URLSearchParams('collection=kinky');
    mockResult.mockReturnValue({ data: [] });
    const user = userEvent.setup();
    renderWithProviders(<AdminPoemsPage />);

    await user.click(await screen.findByRole('button', { name: 'Published' }));
    expect(mockPush).toHaveBeenCalledWith('/admin/poems?collection=kinky&status=published');
  });

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
