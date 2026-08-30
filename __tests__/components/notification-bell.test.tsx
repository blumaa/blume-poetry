import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import { NotificationBell } from '@/components/admin/NotificationBell';

const commentsData = [
  {
    id: 'c1',
    author_name: 'Alice',
    content: 'Lovely poem',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
    poem: { slug: 'autumn', title: 'Autumn' },
  },
];

const likesData = [
  {
    id: 'l1',
    created_at: new Date(Date.now() - 60 * 60000).toISOString(), // 1 hour ago
    poem: { slug: 'winter', title: 'Winter' },
  },
];

const mockFrom = jest.fn((table: string) => ({
  select: jest.fn(() => ({
    order: jest.fn(() => ({
      limit: jest.fn(() =>
        Promise.resolve({ data: table === 'comments' ? commentsData : likesData })
      ),
    })),
  })),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: mockFrom }),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFrom.mockClear();
  });

  it('shows an unread count based on comments + likes newer than last seen', async () => {
    renderWithProviders(<NotificationBell />);
    expect(
      await screen.findByRole('button', { name: 'Notifications (2 unread)' })
    ).toBeInTheDocument();
  });

  it('renders a comment notification with author, content, and timestamp after opening', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    const bellButton = await screen.findByRole(
      'button',
      { name: 'Notifications (2 unread)' }
    );
    await user.click(bellButton);

    // Desktop by default: jest.setup's matchMedia stub matches nothing, so
    // useIsMobile reports desktop and the anchored popover renders.
    expect((await screen.findAllByText('Alice')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/commented on/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Autumn/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lovely poem').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5m ago').length).toBeGreaterThan(0);
  });

  it('renders a like notification with timestamp after opening', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    const bellButton = await screen.findByRole(
      'button',
      { name: 'Notifications (2 unread)' }
    );
    await user.click(bellButton);

    expect((await screen.findAllByText(/New like on/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Winter/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('1h ago').length).toBeGreaterThan(0);
  });

  it('links each notification to its poem', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    const bellButton = await screen.findByRole(
      'button',
      { name: 'Notifications (2 unread)' }
    );
    await user.click(bellButton);

    await screen.findAllByText('Alice');
    const autumnLinks = screen.getAllByRole('link', { name: /Autumn/ });
    expect(autumnLinks.length).toBeGreaterThan(0);
    autumnLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/poem/autumn');
    });
  });

  it('clears the list via the clear button, and keeps it cleared on remount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<NotificationBell />);

    await user.click(
      await screen.findByRole('button', { name: 'Notifications (2 unread)' })
    );
    await screen.findAllByText('Alice');

    await user.click(screen.getByRole('button', { name: 'Clear notifications' }));

    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Clear notifications' })
    ).not.toBeInTheDocument();

    // Cleared state persists in localStorage: a fresh mount shows no unread
    // badge and an empty panel.
    unmount();
    renderWithProviders(<NotificationBell />);
    const bell = await screen.findByRole('button', { name: 'Notifications' });
    await user.click(bell);
    expect(await screen.findByText('No notifications')).toBeInTheDocument();
  });

  describe('on mobile', () => {
    const desktopMatchMedia = window.matchMedia;

    beforeEach(() => {
      window.matchMedia = ((query: string) => ({
        matches: query === '(max-width: 767px)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
      window.matchMedia = desktopMatchMedia;
    });

    it('opens notifications in a modal bottom sheet instead of the popover', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationBell />);

      await user.click(
        await screen.findByRole('button', { name: 'Notifications (2 unread)' })
      );

      // The sheet is a modal dialog on a scrim; the desktop popover is a
      // non-modal dialog with neither.
      expect(screen.getByTestId('mds-scrim')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Notifications' })).toHaveAttribute(
        'aria-modal',
        'true'
      );
      expect((await screen.findAllByText('Alice')).length).toBeGreaterThan(0);
      expect(
        screen.getByRole('button', { name: 'Clear notifications' })
      ).toBeInTheDocument();
    });
  });
});
