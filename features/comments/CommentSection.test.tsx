import { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { CommentSection } from './CommentSection';

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

  it('offers no moderation on the public page', async () => {
    mockFetchSequence([{ ok: true, body: { comments: [comment('1', 'lovely poem')] } }]);
    renderWithProviders(<CommentSection slug="gaps" />);

    await screen.findByText('lovely poem');
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows comments from the server', async () => {
    mockFetchSequence([{ ok: true, body: { comments: [comment('1', 'lovely poem')] } }]);
    renderWithProviders(<CommentSection slug="gaps" />);

    expect(await screen.findByText('lovely poem')).toBeInTheDocument();
  });

  it('shows the new comment from the server answer, without a refetch', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, body: { comments: [comment('1', 'first')] } }, // initial GET
      { ok: true, body: { comment: comment('2', 'second') } }, // POST
    ]);
    const onModalClose = jest.fn();
    renderWithProviders(<ModalHarness slug="gaps" onModalClose={onModalClose} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Your name'), 'Ana');
    await user.type(screen.getByPlaceholderText('Share your thoughts...'), 'second');
    await user.click(screen.getByRole('button', { name: 'Post Comment' }));

    expect(await screen.findByText('second')).toBeInTheDocument();
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' });
    expect(onModalClose).toHaveBeenCalled();
  });
});
