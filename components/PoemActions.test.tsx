import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { PoemActions } from './PoemActions';

jest.mock('@/features/likes', () => ({
  LikeButton: () => <button type="button">like</button>,
}));

const comment = (id: string, content: string, removed = false) => ({
  id,
  parent_id: null,
  author_name: removed ? '' : 'Ana',
  content: removed ? '' : content,
  created_at: '2026-01-01T00:00:00Z',
  removed_at: removed ? '2026-01-02T00:00:00Z' : null,
});

describe('PoemActions', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ comments: [comment('1', 'first'), comment('2', 'second'), comment('3', '', true)] }),
    }) as unknown as typeof fetch;
  });

  it('puts the like and a comments toggle with the live count in one row', async () => {
    renderWithProviders(<PoemActions slug="gaps" />);

    const toggle = await screen.findByRole('button', { name: '2 comments' });
    expect(toggle).toHaveTextContent('2');
    expect(toggle.parentElement?.closest('[role="group"]')).toContainElement(
      screen.getByRole('button', { name: 'like' }),
    );
    expect(screen.queryByRole('button', { name: /add comment/i })).not.toBeInTheDocument();
  });

  it('opens with the thread shown and folds it away on the toggle', async () => {
    renderWithProviders(<PoemActions slug="gaps" />);
    const user = userEvent.setup();

    const toggle = await screen.findByRole('button', { name: '2 comments' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect((await screen.findByText('first')).closest('[inert]')).toBeNull();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('first').closest('[inert]')).not.toBeNull();
  });
});
