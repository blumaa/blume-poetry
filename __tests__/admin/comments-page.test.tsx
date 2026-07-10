import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminCommentsPage from '@/app/admin/comments/page';

const mockOrder = jest.fn();
const mockSelect = jest.fn(() => ({ order: mockOrder }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

const mockShowToast = jest.fn();
jest.mock('@/components/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/components/ConfirmModal', () => ({
  ConfirmModal: ({
    isOpen,
    onConfirm,
    title,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    title: string;
  }) =>
    isOpen ? (
      <div>
        <p>{title}</p>
        <button onClick={onConfirm}>Confirm Delete</button>
      </div>
    ) : null,
}));

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
    mockOrder.mockResolvedValue({ data: comments, error: null });
    global.fetch = jest.fn();
  });

  it('renders both comments with author and content visible', async () => {
    render(<AdminCommentsPage />);

    expect((await screen.findAllByText('Alice')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lovely poem').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Great work').length).toBeGreaterThan(0);
  });

  it('calls the DELETE API with the confirmed comment id after clicking Delete then confirming', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    const user = userEvent.setup();

    render(<AdminCommentsPage />);
    await screen.findAllByText('Alice');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/comments/c1', {
        method: 'DELETE',
      });
    });
  });

  it('removes the comment from the list after a successful delete', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    const user = userEvent.setup();

    render(<AdminCommentsPage />);
    await screen.findAllByText('Alice');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
  });
});
