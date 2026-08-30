import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import { CommentSection } from '@/components/CommentSection';

/* Mirrors the real parent: modal open state lives above and closes on request. */
function ModalHarness({ slug, onModalClose }: { slug: string; onModalClose: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <CommentSection
      slug={slug}
      isModalOpen={open}
      onModalClose={() => {
        setOpen(false);
        onModalClose();
      }}
    />
  );
}

jest.mock('@/lib/visitorId', () => ({
  getVisitorId: () => 'visitor-1',
}));

const mockGetUser = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

const comment = (id: string, content: string) => ({
  id,
  author_name: 'Ana',
  content,
  created_at: '2026-01-01T00:00:00Z',
});

describe('CommentSection', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    delete process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  });

  function mockFetchSequence(responses: Array<{ ok: boolean; body: unknown }>) {
    const fetchMock = jest.fn();
    responses.forEach(({ ok, body }) => {
      fetchMock.mockResolvedValueOnce({
        ok,
        json: async () => body,
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  it('shows comments from the server', async () => {
    mockFetchSequence([{ ok: true, body: { comments: [comment('1', 'lovely poem')] } }]);
    renderWithProviders(<CommentSection slug="gaps" />);

    expect(await screen.findByText('lovely poem')).toBeInTheDocument();
  });

  it('shows the new comment only after the refetch confirms it', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, body: { comments: [comment('1', 'first')] } }, // initial GET
      { ok: true, body: { comment: comment('2', 'second') } }, // POST
      { ok: true, body: { comments: [comment('2', 'second'), comment('1', 'first')] } }, // refetch
    ]);
    const onModalClose = jest.fn();
    renderWithProviders(<ModalHarness slug="gaps" onModalClose={onModalClose} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Your name'), 'Ana');
    await user.type(screen.getByPlaceholderText('Share your thoughts...'), 'second');
    await user.click(screen.getByRole('button', { name: 'Post Comment' }));

    expect(await screen.findByText('second')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' });
    expect(onModalClose).toHaveBeenCalled();
  });

  it('removes a deleted comment only after the refetch', async () => {
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = 'admin@test.com';
    mockGetUser.mockResolvedValue({ data: { user: { email: 'admin@test.com' } } });
    const fetchMock = mockFetchSequence([
      { ok: true, body: { comments: [comment('1', 'first'), comment('2', 'second')] } }, // initial GET
      { ok: true, body: {} }, // DELETE
      { ok: true, body: { comments: [comment('2', 'second')] } }, // refetch
    ]);
    renderWithProviders(<CommentSection slug="gaps" />);
    const user = userEvent.setup();

    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete comment' });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('first')).not.toBeInTheDocument());
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/comments/1');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE' });
  });
});
