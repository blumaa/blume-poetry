import { render, screen, within } from '@testing-library/react';
import PublicationsPage from '@/app/(site)/publications/page';
import { getPublications } from '@/lib/publications';

jest.mock('@/lib/publications', () => ({
  ...jest.requireActual('@/lib/publications'),
  getPublications: jest.fn(),
}));

const issue = 'https://www.streetcakemagazine.com/issue94.pdf';

const publications = [
  {
    id: 'pub3',
    poemTitle: 'Don’t Flip Around',
    journal: 'iExile',
    url: 'https://iexile.com/dont-flip-around',
    publishedOn: '2026-10-01',
    poemSlug: null,
  },
  {
    id: 'pub4',
    poemTitle: 'A Perpetual Burgeoning',
    journal: 'iExile',
    url: 'https://iexile.com/a-perpetual-burgeoning',
    publishedOn: '2026-10-01',
    poemSlug: null,
  },
  {
    id: 'pub2',
    poemTitle: 'Get On It, Comrades 02',
    journal: 'Horror Sleaze Trash',
    url: null,
    publishedOn: '2026-10-01',
    poemSlug: 'get-on-it-comrades-02',
  },
  {
    id: 'pub1',
    poemTitle: 'Super Beaver Moon',
    journal: 'Streetcake Magazine',
    url: issue,
    publishedOn: '2025-01-01',
    poemSlug: null,
  },
  {
    id: 'pub0',
    poemTitle: 'Winter Song',
    journal: 'Streetcake Magazine',
    url: issue,
    publishedOn: '2025-01-01',
    poemSlug: null,
  },
];

async function renderPage() {
  render(await PublicationsPage());
}

/* The outer list holds one entry per journal issue. */
function entries() {
  return screen.getByRole('list', { name: 'Publications' }).querySelectorAll(':scope > li');
}

beforeEach(() => {
  (getPublications as jest.Mock).mockResolvedValue(publications);
});

describe('PublicationsPage', () => {
  it('lists one entry per journal and month, in the order given', async () => {
    await renderPage();
    const items = entries();
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('iExile');
    expect(items[0]).toHaveTextContent('October 2026');
    expect(items[0]).toHaveTextContent('Don’t Flip Around');
    expect(items[0]).toHaveTextContent('A Perpetual Burgeoning');
    expect(items[1]).toHaveTextContent('Horror Sleaze Trash');
    expect(items[2]).toHaveTextContent('January 2025');
  });

  it('links each poem title to its published piece', async () => {
    await renderPage();
    const iexile = entries()[0] as HTMLElement;
    expect(within(iexile).getByRole('link', { name: 'Don’t Flip Around' })).toHaveAttribute(
      'href',
      'https://iexile.com/dont-flip-around'
    );
    expect(within(iexile).getByRole('link', { name: 'A Perpetual Burgeoning' })).toHaveAttribute(
      'href',
      'https://iexile.com/a-perpetual-burgeoning'
    );
    expect(within(iexile).queryByRole('link', { name: 'iExile' })).not.toBeInTheDocument();
  });

  it('links the journal once when every poem shares one piece', async () => {
    await renderPage();
    const streetcake = entries()[2] as HTMLElement;
    const links = within(streetcake).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Streetcake Magazine');
    expect(links[0]).toHaveAttribute('href', issue);
  });

  it('falls back to the poem’s page on this site when the piece is not online', async () => {
    await renderPage();
    const hst = entries()[1] as HTMLElement;
    expect(within(hst).getByRole('link', { name: 'Get On It, Comrades 02' })).toHaveAttribute(
      'href',
      '/poem/get-on-it-comrades-02'
    );
  });

  it('says so when nothing is listed yet', async () => {
    (getPublications as jest.Mock).mockResolvedValue([]);
    await renderPage();
    expect(screen.getByText(/No publications yet/)).toBeInTheDocument();
  });
});
