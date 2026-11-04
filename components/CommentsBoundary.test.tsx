import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { CommentsBoundary } from './CommentsBoundary';
import { useCommentCount } from '@/features/comments';

const mockGetPoemComments = jest.fn();
jest.mock('@/lib/comments', () => ({
  getPoemComments: (poemId: string) => mockGetPoemComments(poemId),
}));

const comment = (id: string) => ({
  id,
  parent_id: null,
  author_name: 'Ana',
  content: 'words',
  created_at: '2026-01-01T00:00:00Z',
  removed_at: null,
});

function Count({ slug }: { slug: string }) {
  const count = useCommentCount(slug);
  return <p>{count === undefined ? 'loading' : `${count} comments`}</p>;
}

describe('CommentsBoundary', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ comments: [comment('1'), comment('2')] }),
    }) as unknown as typeof fetch;
  });

  /* The page renders with its comments: no loading state on first paint. */
  it('hands the server-read comments to the client cache before first paint', async () => {
    mockGetPoemComments.mockResolvedValue([comment('1'), comment('2')]);

    renderWithProviders(
      await CommentsBoundary({ poemId: 'poem-1', slug: 'gaps', children: <Count slug="gaps" /> })
    );

    expect(mockGetPoemComments).toHaveBeenCalledWith('poem-1');
    expect(screen.getByText('2 comments')).toBeInTheDocument();
  });

  it('leaves a failed read to the client fetch instead of breaking the page', async () => {
    mockGetPoemComments.mockRejectedValue(new Error('db down'));

    renderWithProviders(
      await CommentsBoundary({ poemId: 'poem-1', slug: 'gaps', children: <Count slug="gaps" /> })
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('2 comments')).toBeInTheDocument();
  });
});
