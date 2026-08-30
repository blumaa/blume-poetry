import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import { LikeButton } from '@/components/LikeButton';

jest.mock('@/lib/visitorId', () => ({
  getVisitorId: () => 'visitor-1',
}));

describe('LikeButton', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
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

  it('shows the count from the server', async () => {
    mockFetchSequence([{ ok: true, body: { count: 3, hasLiked: false } }]);
    renderWithProviders(<LikeButton slug="gaps" />);

    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('updates the count only after the server confirms the like', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, body: { count: 3, hasLiked: false } }, // initial GET
      { ok: true, body: { liked: true } }, // POST
      { ok: true, body: { count: 4, hasLiked: true } }, // refetch GET
    ]);
    renderWithProviders(<LikeButton slug="gaps" />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button'));

    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' });
  });

  it('keeps the server count when the like fails', async () => {
    mockFetchSequence([
      { ok: true, body: { count: 3, hasLiked: false } }, // initial GET
      { ok: false, body: { error: 'Failed to like' } }, // POST fails
    ]);
    renderWithProviders(<LikeButton slug="gaps" />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button'));

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(screen.queryByText('4')).not.toBeInTheDocument();
  });
});
