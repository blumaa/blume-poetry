/** @jest-environment node */
import { getPublications, groupPublications, type Publication } from '@/lib/publications';

// Each query resolves with whatever mockResult returns at the time, and is
// recorded with the name of the client that ran it.
const mockResult = jest.fn();
const mockQueries: Array<{ client: string; table: string; argsOf(method: string): unknown[][] }> = [];

jest.mock('@/lib/supabase/anon', () => {
  const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
  const client = (name: string) => () => ({
    from: (table: string) => {
      const query = queryMock(mockResult());
      mockQueries.push({ client: name, table, argsOf: query.argsOf });
      return query;
    },
  });
  return {
    getCachedPoemClient: client('cached-anon'),
    getCachedPublicationClient: client('cached-publications'),
    getCachedServiceClient: client('cached-service'),
  };
});

beforeEach(() => {
  mockResult.mockReset();
  mockQueries.length = 0;
});

const row = {
  id: 'pub1',
  poem_title: 'Heat Break',
  journal: 'The Broken Spine',
  url: 'https://thebrokenspine.co.uk/heat-break',
  published_on: '2024-12-01',
  poem: { slug: 'heat-break' },
};

describe('getPublications', () => {
  /* The anon key ships to the browser, so it is what the public page reads
     with: RLS shows it only published main poems to link to. */
  it('reads with the cached anon client', async () => {
    mockResult.mockReturnValue({ data: [] });
    await getPublications();
    expect(mockQueries[0]).toMatchObject({ client: 'cached-publications', table: 'publications' });
  });

  it('lists the newest first', async () => {
    mockResult.mockReturnValue({ data: [] });
    await getPublications();
    expect(mockQueries[0].argsOf('order')).toEqual([['published_on', { ascending: false }]]);
  });

  it('maps rows to the domain shape, with the linked poem’s slug', async () => {
    mockResult.mockReturnValue({ data: [row] });
    await expect(getPublications()).resolves.toEqual([
      {
        id: 'pub1',
        poemTitle: 'Heat Break',
        journal: 'The Broken Spine',
        url: 'https://thebrokenspine.co.uk/heat-break',
        publishedOn: '2024-12-01',
        poemSlug: 'heat-break',
      },
    ]);
  });

  /* A poem not on the site, or one RLS hides (a draft, a kinky poem), comes
     back as null: the entry lists the title without a link. */
  it('gives no slug when the poem is not linked or not public', async () => {
    mockResult.mockReturnValue({ data: [{ ...row, poem: null }] });
    const [publication] = await getPublications();
    expect(publication.poemSlug).toBeNull();
  });

  it('throws on a database error', async () => {
    mockResult.mockReturnValue({ error: { message: 'connection refused' } });
    await expect(getPublications()).rejects.toThrow('connection refused');
  });
});

describe('groupPublications', () => {
  const credit = (id: string, overrides: Partial<Publication>): Publication => ({
    id,
    poemTitle: `Poem ${id}`,
    journal: 'iExile',
    url: `https://iexile.com/${id}`,
    publishedOn: '2026-10-01',
    poemSlug: null,
    ...overrides,
  });

  /* One entry per journal issue: poems in the same journal and month. */
  it('groups poems by journal and month, keeping the given order', () => {
    const groups = groupPublications([
      credit('a', {}),
      credit('b', { journal: 'Horror Sleaze Trash' }),
      credit('c', {}),
      credit('d', { publishedOn: '2025-01-01' }),
    ]);
    expect(groups.map((g) => [g.journal, g.publishedOn, g.poems.map((p) => p.id)])).toEqual([
      ['iExile', '2026-10-01', ['a', 'c']],
      ['Horror Sleaze Trash', '2026-10-01', ['b']],
      ['iExile', '2025-01-01', ['d']],
    ]);
  });

  /* Every title links, even when the poems share one piece (an issue PDF),
     so every entry reads the same way. */
  it('keeps each poem’s own link, shared or not', () => {
    const issue = 'https://journal.example/issue.pdf';
    const [group] = groupPublications([credit('a', { url: issue }), credit('b', { url: issue })]);
    expect(group).not.toHaveProperty('url');
    expect(group.poems.map((p) => p.url)).toEqual([issue, issue]);
  });
});
