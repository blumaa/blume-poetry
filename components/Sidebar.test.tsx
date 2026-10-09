import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { Sidebar } from '@/components/Sidebar';
import type { TreeNode } from '@/lib/poems';

jest.mock('next/navigation', () => ({
  usePathname: () => '/poem/poem-b',
}));

const tree: TreeNode[] = [
  {
    id: 'folder-1',
    label: 'Collection One',
    type: 'folder',
    count: 2,
    children: [
      { id: 'poem-a', label: 'Poem A', type: 'poem', slug: 'poem-a' },
      { id: 'poem-b', label: 'Poem B', type: 'poem', slug: 'poem-b' },
    ],
  },
  {
    id: 'poem-c',
    label: 'Poem C',
    type: 'poem',
    slug: 'poem-c',
  },
];

function renderSidebar(props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  return renderWithProviders(<Sidebar tree={tree} {...props} />);
}

describe('Sidebar', () => {
  it('renders a search input', () => {
    renderSidebar();
    expect(screen.getByRole('searchbox', { name: 'Search poems' })).toBeInTheDocument();
  });

  it('renders the tree nav with folder and top-level poem items', () => {
    renderSidebar();
    expect(screen.getByText('Collection One')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Poem C' })).toBeInTheDocument();
  });

  it('auto-expands the folder containing the active poem and highlights it', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Poem B' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders footer content (subscribe form + navigation hint)', () => {
    renderSidebar();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    expect(screen.getByText(/navigate/i)).toBeInTheDocument();
  });

  it('renders a close button when isMobile is true', () => {
    renderSidebar({ isMobile: true, isOpen: true });
    expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument();
  });

  it('renders a collapse toggle button when isMobile is false', () => {
    renderSidebar({ isMobile: false, isCollapsed: false });
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
  });

  it('hides search and footer when the desktop sidebar is collapsed', () => {
    renderSidebar({ isMobile: false, isCollapsed: true });
    expect(screen.queryByPlaceholderText('Search poems...')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('shows debounced search results from the server', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        poems: [
          {
            id: 'poem-x',
            slug: 'poem-x',
            title: 'Found Poem',
            subtitle: null,
            content: '',
            plainText: '',
            publishedAt: '2026-01-01',
            url: '/poem/poem-x',
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderSidebar({ isMobile: false });
    const user = userEvent.setup();

    const input = screen.getByRole('searchbox', { name: 'Search poems' });
    await user.type(input, 'found');

    expect(await screen.findByRole('link', { name: 'Found Poem' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/poems/search?q=found', expect.anything());
    // Debounce: one request for the whole word, not one per keystroke.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('takes a closed mobile drawer out of focus order and the accessibility tree', () => {
    const { container, rerender } = renderSidebar({ isMobile: true, isOpen: false });
    expect(container.querySelector('aside')).toHaveAttribute('inert');
    rerender(<Sidebar tree={tree} isMobile isOpen />);
    expect(container.querySelector('aside')).not.toHaveAttribute('inert');
  });

  it('never makes the desktop sidebar inert', () => {
    const { container } = renderSidebar({ isMobile: false, isOpen: false });
    expect(container.querySelector('aside')).not.toHaveAttribute('inert');
  });

  it('closes the drawer when a poem link is clicked', async () => {
    const onClose = jest.fn();
    renderSidebar({ isMobile: true, isOpen: true, onClose });
    await userEvent.click(screen.getByRole('link', { name: 'Poem C' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('marks the collapsed desktop sidebar so the page margin can follow it in CSS', () => {
    const { container } = renderSidebar({ isMobile: false, isCollapsed: true });
    expect(container.querySelector('aside')).toHaveAttribute('data-sidebar-collapsed');
  });

  it("lets the reader close the active poem's folder and open it again", async () => {
    renderSidebar();
    const folder = screen.getByRole('button', { name: /Collection One/ });
    expect(folder).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(folder);
    expect(folder).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Poem B' })).not.toBeInTheDocument();

    await userEvent.click(folder);
    expect(folder).toHaveAttribute('aria-expanded', 'true');
  });

  it("keeps a closed folder's group in the DOM, hidden, so aria-controls points at it", async () => {
    const { container } = renderSidebar();
    const folder = screen.getByRole('button', { name: /Collection One/ });
    await userEvent.click(folder);
    const group = container.querySelector(`#${folder.getAttribute('aria-controls')}`);
    expect(group).toHaveAttribute('hidden');
  });
});
