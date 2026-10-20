import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { NotificationBell } from './NotificationBell';

const commentsData = [
  {
    id: 'c1',
    author_name: 'Alice',
    content: 'Lovely poem',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
    poem: { slug: 'autumn', title: 'Autumn', collection: 'main' },
  },
];

const likesData = [
  {
    id: 'l1',
    created_at: new Date(Date.now() - 60 * 60000).toISOString(), // 1 hour ago
    poem: { slug: 'winter', title: 'Winter', collection: 'kinky' },
  },
];

/* A fake server for the inbox marks. Each render gets a fresh QueryClient, so
   a remount reads the marks back like another device would. */
type Marks = { last_seen_at: string | null; cleared_at: string | null };
let serverMarks: Marks | null = null;
let failWrites = false;

const later = (a: string | null | undefined, b: string | null | undefined) =>
  !a ? (b ?? null) : !b ? a : new Date(a) > new Date(b) ? a : b;

const mockRpc = jest.fn(
  (_name: string, args: { p_last_seen: string; p_cleared?: string }) => ({
    throwOnError: async () => {
      if (failWrites) throw new Error('connection lost');
      serverMarks = {
        last_seen_at: later(serverMarks?.last_seen_at, args.p_last_seen),
        cleared_at: later(serverMarks?.cleared_at, args.p_cleared),
      };
      return { data: serverMarks, error: null };
    },
  })
);

const mockFrom = jest.fn((table: string) =>
  table === 'admin_inbox'
    ? {
        select: () => ({
          maybeSingle: () => ({
            throwOnError: async () => ({ data: serverMarks, error: null }),
          }),
        }),
      }
    : {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() =>
              Promise.resolve({ data: table === 'comments' ? commentsData : likesData })
            ),
          })),
        })),
      }
);

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    serverMarks = null;
    failWrites = false;
    mockFrom.mockClear();
    mockRpc.mockClear();
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
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/commented on/)).toBeInTheDocument();
    expect(screen.getByText(/Autumn/)).toBeInTheDocument();
    expect(screen.getByText('Lovely poem')).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('renders a like notification with timestamp after opening', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    const bellButton = await screen.findByRole(
      'button',
      { name: 'Notifications (2 unread)' }
    );
    await user.click(bellButton);

    expect(await screen.findByText(/New like on/)).toBeInTheDocument();
    expect(screen.getByText(/Winter/)).toBeInTheDocument();
    expect(screen.getByText('1h ago')).toBeInTheDocument();
  });

  it('links each notification to its poem', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    const bellButton = await screen.findByRole(
      'button',
      { name: 'Notifications (2 unread)' }
    );
    await user.click(bellButton);

    await screen.findByText('Alice');
    const autumnLinks = screen.getAllByRole('link', { name: /Autumn/ });
    expect(autumnLinks.length).toBeGreaterThan(0);
    autumnLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/poem/autumn');
    });
    // Winter is kinky, so it links under /kinky.
    screen.getAllByRole('link', { name: /Winter/ }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/kinky/winter');
    });
  });

  it('clears the list via the clear button, and keeps it cleared on remount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<NotificationBell />);

    await user.click(
      await screen.findByRole('button', { name: 'Notifications (2 unread)' })
    );
    await screen.findByText('Alice');

    await user.click(screen.getByRole('button', { name: 'Clear notifications' }));

    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Clear notifications' })
    ).not.toBeInTheDocument();

    // Cleared state lives on the server: a fresh mount (another device)
    // shows no unread badge and an empty panel.
    unmount();
    renderWithProviders(<NotificationBell />);
    const bell = await screen.findByRole('button', { name: 'Notifications' });
    await user.click(bell);
    expect(await screen.findByText('No notifications')).toBeInTheDocument();
  });

  it('clearing in one bell clears every mounted bell (one source of truth)', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <NotificationBell />
        <NotificationBell />
      </>
    );

    const [first] = await screen.findAllByRole('button', { name: 'Notifications (2 unread)' });
    await user.click(first);
    await user.click(await screen.findByRole('button', { name: 'Clear notifications' }));

    expect(
      screen.queryByRole('button', { name: 'Notifications (2 unread)' })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Notifications' })).toHaveLength(2);
  });

  it('opening saves the newest item as seen, so another device shows nothing unread', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<NotificationBell />);

    await user.click(
      await screen.findByRole('button', { name: 'Notifications (2 unread)' })
    );

    // The mark is the newest item's server timestamp, not the device clock.
    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('advance_inbox_marks', {
        p_last_seen: commentsData[0].created_at,
        p_cleared: undefined,
      })
    );

    unmount();
    renderWithProviders(<NotificationBell />);
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('says so when clearing fails, and keeps the list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    await user.click(
      await screen.findByRole('button', { name: 'Notifications (2 unread)' })
    );
    await screen.findByText('Alice');
    failWrites = true;
    await user.click(screen.getByRole('button', { name: 'Clear notifications' }));

    expect(await screen.findByText('connection lost')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
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
      expect(await screen.findByText('Alice')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Clear notifications' })
      ).toBeInTheDocument();
    });
  });
});
