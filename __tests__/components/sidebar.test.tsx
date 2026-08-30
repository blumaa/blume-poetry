import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/Sidebar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/mds';
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
  return render(
    <ThemeProvider>
      <ToastProvider regionLabel="Notifications" dismissLabel="Dismiss:">
        <Sidebar tree={tree} {...props} />
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('Sidebar', () => {
  it('renders a search input', () => {
    renderSidebar();
    // jsdom ignores responsive tailwind classes, so both the mobile and
    // desktop branches render simultaneously — assert on "some" not "one".
    expect(screen.getAllByPlaceholderText('Search poems...').length).toBeGreaterThan(0);
  });

  it('renders the tree nav with folder and top-level poem items', () => {
    renderSidebar();
    expect(screen.getAllByText('Collection One').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Poem C' }).length).toBeGreaterThan(0);
  });

  it('auto-expands the folder containing the active poem and highlights it', () => {
    renderSidebar();
    const activeLinks = screen.getAllByRole('link', { name: 'Poem B' });
    expect(activeLinks.length).toBeGreaterThan(0);
    activeLinks.forEach((link) => {
      expect(link).toHaveAttribute('aria-current', 'page');
    });
  });

  it('renders footer content (subscribe form + navigation hint)', () => {
    renderSidebar();
    expect(screen.getAllByPlaceholderText('your@email.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/navigate/i).length).toBeGreaterThan(0);
  });

  it('renders a close button when isMobile is true', () => {
    renderSidebar({ isMobile: true, isOpen: true });
    expect(screen.getAllByLabelText('Close navigation menu').length).toBeGreaterThan(0);
  });

  it('renders a collapse toggle button when isMobile is false', () => {
    renderSidebar({ isMobile: false, isCollapsed: false });
    expect(screen.getAllByLabelText('Collapse sidebar').length).toBeGreaterThan(0);
  });

  it('hides search and footer when the desktop sidebar is collapsed', () => {
    renderSidebar({ isMobile: false, isCollapsed: true });
    expect(screen.queryByPlaceholderText('Search poems...')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Expand sidebar').length).toBeGreaterThan(0);
  });
});
