import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    render(<NotificationBell />);
    expect(
      await screen.findByRole('button', { name: 'Notifications (2 unread)' })
    ).toBeInTheDocument();
  });

  it('renders a comment notification with author, content, and timestamp after opening', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    const bellButton = await screen.findByRole(
      'button',
      { name: 'Notifications (2 unread)' }
    );
    await user.click(bellButton);

    // jsdom ignores responsive tailwind classes, so both the mobile bottom
    // sheet and desktop dropdown render simultaneously — use getAllBy*.
    expect((await screen.findAllByText('Alice')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/commented on/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Autumn/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lovely poem').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5m ago').length).toBeGreaterThan(0);
  });

  it('renders a like notification with timestamp after opening', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

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
    render(<NotificationBell />);

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
});
