import type { ReactElement } from 'react';
import { render as rtlRender, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconRegistry } from '@/components/icons';
import { CommentThread } from './CommentThread';
import type { ThreadComment } from './thread';

const HERS: ThreadComment = {
  id: 'c1',
  author: 'Mai',
  body: 'The first line sits high.',
  createdAt: '2026-03-12T10:00:00Z',
};

const HIS: ThreadComment = {
  id: 'c2',
  author: 'Jo',
  body: 'And the last one lands.',
  createdAt: '2026-03-13T10:00:00Z',
};

const render = (ui: ReactElement) => rtlRender(<IconRegistry>{ui}</IconRegistry>);
const bubble = (body: string) => within(screen.getByText(body).closest('li')!);

describe('CommentThread', () => {
  it('names itself, so a reader can jump straight to the comments', () => {
    render(<CommentThread comments={[HERS]} />);

    expect(screen.getByRole('region', { name: 'Comments' })).toBeInTheDocument();
  });

  it('says who wrote each comment, when, and what they said', () => {
    render(<CommentThread comments={[HERS]} />);

    expect(screen.getByText('The first line sits high.')).toBeInTheDocument();
    expect(screen.getByText('Mai')).toBeInTheDocument();
    expect(screen.getByText('12/03/2026')).toBeInTheDocument();
  });

  it.each([
    [1, '1 comment'],
    [2, '2 comments'],
  ])('counts the comments (%i)', (count, text) => {
    render(<CommentThread comments={[HERS, HIS]} count={count} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('says so when nobody has written anything', () => {
    render(<CommentThread comments={[]} />);

    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('nests a reply under what it answers', () => {
    render(<CommentThread comments={[{ ...HERS, replies: [HIS] }]} />);

    expect(bubble('The first line sits high.').getByText('And the last one lands.')).toBeInTheDocument();
  });

  it('folds the replies away and back, counting them either way', async () => {
    render(<CommentThread comments={[{ ...HERS, replies: [HIS] }]} />);

    const fold = screen.getByRole('button', { name: '1 reply' });
    expect(fold).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(fold);
    expect(screen.getByText('And the last one lands.').closest('[inert]')).not.toBeNull();
    expect(fold).toHaveAttribute('aria-expanded', 'false');
  });

  it('leaves a tombstone where a comment was removed, with its reply still under it', () => {
    render(<CommentThread comments={[{ id: 'c1', removed: true, replies: [HIS] }]} onReply={() => {}} />);

    expect(screen.getByText('Comment removed')).toBeInTheDocument();
    expect(screen.getByText('And the last one lands.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Reply' })).toHaveLength(1);
  });

  it('hands the comment id back when Reply is pressed', async () => {
    const onReply = jest.fn();
    render(<CommentThread comments={[HERS]} onReply={onReply} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reply' }));

    expect(onReply).toHaveBeenCalledWith('c1');
  });

  it('offers no Reply when nothing is wired to it', () => {
    render(<CommentThread comments={[HERS]} />);

    expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull();
  });

  it('puts the composer above the comments', () => {
    render(<CommentThread comments={[HERS]} composer={<textarea aria-label="Top" />} />);

    const top = screen.getByRole('textbox', { name: 'Top' });
    const first = screen.getByText('The first line sits high.');
    expect(top.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens the reply field under the comment being answered and nowhere else', () => {
    render(
      <CommentThread
        comments={[HERS, HIS]}
        replyingTo="c1"
        replyComposer={<textarea aria-label="Reply field" />}
      />
    );

    expect(bubble('The first line sits high.').getByRole('textbox', { name: 'Reply field' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: 'Reply field' })).toHaveLength(1);
  });

  it('stops indenting once the thread is deeper than it has room for', () => {
    const deep: ThreadComment = {
      ...HERS,
      replies: [{ ...HIS, replies: [{ id: 'c3', author: 'Ada', body: 'Third one down.', createdAt: HIS.createdAt }] }],
    };
    render(<CommentThread comments={[deep]} maxIndent={1} />);

    const third = screen.getByText('Third one down.').closest('li')!;
    expect(third.parentElement?.className).toContain('flat');
  });
});
