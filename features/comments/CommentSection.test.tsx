import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { CommentSection } from './CommentSection';

jest.mock('@/lib/visitorId', () => ({
  getVisitorId: () => 'visitor-1',
}));

const comment = (id: string, content: string, parent_id: string | null = null) => ({
  id,
  parent_id,
  author_name: 'Ana',
  content,
  created_at: '2026-01-01T00:00:00Z',
  removed_at: null,
});

const PARENT_ID = '11111111-1111-4111-8111-111111111111';

describe('CommentSection', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    // The spam timer: a human takes more than 3 seconds.
    jest.spyOn(Date, 'now').mockReturnValue(0);
  });

  function mockFetchSequence(responses: Array<{ ok: boolean; body: unknown }>) {
    const fetchMock = jest.fn();
    responses.forEach(({ ok, body }) => {
      fetchMock.mockResolvedValueOnce({ ok, json: async () => body });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  const sentBody = (fetchMock: jest.Mock, call: number) => JSON.parse(fetchMock.mock.calls[call][1].body);

  it('offers no moderation on the public page', async () => {
    mockFetchSequence([{ ok: true, body: { comments: [comment('1', 'lovely poem')] } }]);
    renderWithProviders(<CommentSection slug="gaps" />);

    await screen.findByText('lovely poem');
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows the thread from the server, replies under what they answer, with no count of its own', async () => {
    mockFetchSequence([
      { ok: true, body: { comments: [comment(PARENT_ID, 'first'), comment('2', 'answer', PARENT_ID)] } },
    ]);
    renderWithProviders(<CommentSection slug="gaps" />);

    const first = await screen.findByText('first');
    expect(within(first.closest('li')!).getByText('answer')).toBeInTheDocument();
    // The footer toggle carries the count.
    expect(screen.queryByText('2 comments')).not.toBeInTheDocument();
  });

  it('posts a top-level comment and shows it from the server answer, without a refetch', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, body: { comments: [comment('1', 'first')] } },
      { ok: true, body: { comment: comment('2', 'second') } },
    ]);
    renderWithProviders(<CommentSection slug="gaps" />);
    const user = userEvent.setup();
    await screen.findByText('first');

    await user.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'second');
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ana');
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('second')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentBody(fetchMock, 1)).toMatchObject({
      visitorId: 'visitor-1',
      authorName: 'Ana',
      content: 'second',
      parentId: null,
    });
    expect(screen.getByRole('textbox', { name: 'Add a comment' })).toHaveValue('');
  });

  it('sends an optional email for reply notices, explains it, and remembers it', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, body: { comments: [] } },
      { ok: true, body: { comment: comment('2', 'hello') } },
    ]);
    renderWithProviders(<CommentSection slug="gaps" />);
    const user = userEvent.setup();
    await screen.findByText('No comments yet.');

    await user.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'hello');
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ana');
    const email = screen.getByRole('textbox', { name: 'Email (optional)' });
    expect(email).toHaveAccessibleDescription(/only to tell you when someone replies/i);
    await user.type(email, 'ana@example.com');
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await screen.findByText('hello');
    expect(sentBody(fetchMock, 1)).toMatchObject({ email: 'ana@example.com' });
    expect(localStorage.getItem('comment_email')).toBe('ana@example.com');
  });

  it('sends without an email', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, body: { comments: [] } },
      { ok: true, body: { comment: comment('2', 'hello') } },
    ]);
    renderWithProviders(<CommentSection slug="gaps" />);
    const user = userEvent.setup();
    await screen.findByText('No comments yet.');

    await user.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'hello');
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ana');
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await screen.findByText('hello');
    expect(sentBody(fetchMock, 1)).toMatchObject({ email: '' });
    expect(localStorage.getItem('comment_email')).toBeNull();
  });

  it('opens a reply field under the comment, sends it as a reply, and closes it', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, body: { comments: [comment(PARENT_ID, 'first')] } },
      { ok: true, body: { comment: comment('2', 'my answer', PARENT_ID) } },
    ]);
    localStorage.setItem('comment_name', 'Ana');
    renderWithProviders(<CommentSection slug="gaps" />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Reply' }));
    expect(screen.getByText('Replying to Ana')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Write a reply' }), 'my answer');
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
    const replyForm = screen.getByRole('textbox', { name: 'Write a reply' }).closest('form')!;
    await user.click(within(replyForm).getByRole('button', { name: 'Send' }));

    const answer = await screen.findByText('my answer');
    expect(within(screen.getByText('first').closest('li')!).getByText('my answer')).toBe(answer);
    expect(sentBody(fetchMock, 1)).toMatchObject({ parentId: PARENT_ID, authorName: 'Ana' });
    expect(screen.queryByRole('textbox', { name: 'Write a reply' })).toBeNull();
  });

  it('closes the reply field on cancel without sending', async () => {
    const fetchMock = mockFetchSequence([{ ok: true, body: { comments: [comment(PARENT_ID, 'first')] } }]);
    renderWithProviders(<CommentSection slug="gaps" />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Reply' }));
    await user.click(screen.getByRole('button', { name: 'Stop replying' }));

    expect(screen.queryByRole('textbox', { name: 'Write a reply' })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps what was written when the server refuses it', async () => {
    mockFetchSequence([
      { ok: true, body: { comments: [] } },
      { ok: false, body: { error: 'Please take your time' } },
    ]);
    renderWithProviders(<CommentSection slug="gaps" />);
    const user = userEvent.setup();
    await screen.findByText('No comments yet.');

    await user.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'too fast');
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Please take your time')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Add a comment' })).toHaveValue('too fast');
  });
});
