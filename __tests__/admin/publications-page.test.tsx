import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import AdminPublicationsPage from '@/app/admin/publications/page';

import type { QueryMock } from '@/__tests__/supabaseMock';

const isSingle = (calls: QueryMock['calls']) => calls.some(([method]) => method === 'single');

// Each query resolves with whatever mockResult returns for its table and calls.
const mockResult = jest.fn();
const mockQueries: Array<{ table: string; query: QueryMock }> = [];

jest.mock('@/lib/supabase/client', () => {
  const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
  return {
    createClient: () => ({
      from: (table: string) => {
        const query = queryMock((calls: QueryMock['calls']) => mockResult(table, calls));
        mockQueries.push({ table, query });
        return query;
      },
    }),
  };
});

const publication = {
  id: 'pub1',
  poem_id: 'p1',
  poem_title: 'Heat Break',
  journal: 'The Broken Spine',
  url: null,
  published_on: '2024-12-01',
  created_at: '2026-10-31T00:00:00Z',
};

const poem = {
  id: 'p2',
  slug: 'super-beaver-moon',
  title: 'Super Beaver Moon',
  status: 'published',
  pinned: false,
  published_at: '2025-01-01T00:00:00Z',
  plain_text: '',
  collection: 'main',
};

const writesTo = (method: string) =>
  mockQueries.filter(({ table, query }) => table === 'publications' && query.argsOf(method).length > 0);

const fetchMock = jest.fn();

beforeEach(() => {
  mockResult.mockReset();
  mockQueries.length = 0;
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ revalidated: true }) });
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('AdminPublicationsPage', () => {
  it('lists publications with journal and month', async () => {
    mockResult.mockImplementation((table: string) => ({ data: table === 'publications' ? [publication] : [] }));
    renderWithProviders(<AdminPublicationsPage />);

    const row = (await screen.findByText('Heat Break')).closest('tr')!;
    expect(within(row).getByText('The Broken Spine')).toBeInTheDocument();
    expect(within(row).getByText('December 2024')).toBeInTheDocument();
  });

  it('says so when there are none', async () => {
    mockResult.mockReturnValue({ data: [] });
    renderWithProviders(<AdminPublicationsPage />);
    expect(await screen.findByText(/No publications yet/)).toBeInTheDocument();
  });

  it('adds a publication linked to a site poem, then refreshes the public page', async () => {
    mockResult.mockImplementation((table: string, calls: QueryMock['calls']) =>
      table === 'poems' ? { data: [poem] } : { data: isSingle(calls) ? { ...publication, id: 'pub2' } : [] }
    );
    const user = userEvent.setup();
    renderWithProviders(<AdminPublicationsPage />);

    await user.click(await screen.findByRole('button', { name: 'New Publication' }));
    const dialog = await screen.findByRole('dialog');
    await user.selectOptions(
      await within(dialog).findByRole('combobox', { name: 'Poem on this site' }),
      'p2'
    );
    // Picking a poem fills an empty title with its title.
    expect(within(dialog).getByRole('textbox', { name: /Poem title/ })).toHaveValue('Super Beaver Moon');
    await user.type(within(dialog).getByRole('textbox', { name: /Journal/ }), 'Streetcake Magazine');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /Month/ }), 'January');
    await user.type(within(dialog).getByRole('spinbutton', { name: /Year/ }), '2025');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await screen.findByText('Publication added');
    expect(writesTo('insert')[0].query.argsOf('insert')).toEqual([[
      {
        poem_id: 'p2',
        poem_title: 'Super Beaver Moon',
        journal: 'Streetcake Magazine',
        url: null,
        published_on: '2025-01-01',
      },
    ]]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/revalidate',
      expect.objectContaining({ body: JSON.stringify({ scope: 'publications' }) })
    );
  });

  it('edits a publication in place', async () => {
    mockResult.mockImplementation((table: string, calls: QueryMock['calls']) =>
      table === 'poems' ? { data: [] } : { data: isSingle(calls) ? publication : [publication] }
    );
    const user = userEvent.setup();
    renderWithProviders(<AdminPublicationsPage />);

    await user.click(await screen.findByRole('button', { name: 'Edit Heat Break' }));
    const dialog = await screen.findByRole('dialog');
    const link = within(dialog).getByRole('textbox', { name: /Link/ });
    await user.type(link, 'https://thebrokenspine.co.uk/heat-break');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await screen.findByText('Publication saved');
    const update = writesTo('update')[0].query;
    expect(update.argsOf('update')[0][0]).toMatchObject({ url: 'https://thebrokenspine.co.uk/heat-break' });
    expect(update.argsOf('eq')).toEqual([['id', 'pub1']]);
  });

  it('deletes a publication after confirmation', async () => {
    mockResult.mockImplementation((table: string) => ({ data: table === 'publications' ? [publication] : [] }));
    const user = userEvent.setup();
    renderWithProviders(<AdminPublicationsPage />);

    await user.click(await screen.findByRole('button', { name: 'Delete Heat Break' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await screen.findByText('"Heat Break" deleted');
    expect(writesTo('delete')[0].query.argsOf('eq')).toEqual([['id', 'pub1']]);
  });
});
