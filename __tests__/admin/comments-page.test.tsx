import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import AdminCommentsPage from '@/app/admin/comments/page';

// Each comments query resolves with whatever mockOrder returns at the time.
const mockOrder = jest.fn();

jest.mock('@/lib/supabase/client', () => {
  const { queryMock } = jest.requireActual('@/__tests__/supabaseMock');
  return { createClient: () => ({ from: () => queryMock(mockOrder()) }) };
});

function renderPage() {
  return renderWithProviders(<AdminCommentsPage />);
}

async function confirmInDialog(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
}

const comments = [
  {
    id: 'c1',
    poem_id: 'p1',
    visitor_id: 'v1',
    author_name: 'Alice',
    content: 'Lovely poem',
    created_at: '2026-01-01T00:00:00.000Z',
    poems: { title: 'Autumn', slug: 'autumn' },
  },
  {
    id: 'c2',
    poem_id: 'p2',
    visitor_id: 'v2',
    author_name: 'Bob',
    content: 'Great work',
    created_at: '2026-01-02T00:00:00.000Z',
    poems: { title: 'Winter', slug: 'winter' },
  },
];

describe('AdminCommentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder.mockReturnValue({ data: comments, error: null });
    global.fetch = jest.fn();
  });

  it('says so when comments fail to load, rather than showing an empty list', async () => {
    mockOrder.mockReturnValue({ data: null, error: { message: 'connection lost' } });
    renderPage();

    expect(await screen.findByText('Failed to load comments')).toBeInTheDocument();
    expect(screen.queryByText('No comments found.')).not.toBeInTheDocument();
  });

  it('renders both comments with author and content visible', async () => {
    renderPage();

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Lovely poem')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Great work')).toBeInTheDocument();
  });

  it('calls the DELETE API with the confirmed comment id after clicking Delete then confirming', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Alice');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);
    await confirmInDialog(user);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/comments/c1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('removes the comment from the list only after the refetch confirms it', async () => {
    // Deterministic: the row disappears via the post-delete refetch, not a local splice.
    mockOrder
      .mockReturnValueOnce({ data: comments, error: null })
      .mockReturnValueOnce({ data: [comments[1]], error: null });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Alice');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);
    await confirmInDialog(user);

    await waitFor(() => {
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});
