import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { queryKeys } from '@/lib/queryKeys';
import type { PoemRow } from '@/lib/supabase/types';
import { PoemEditor } from './PoemEditor';
import { savePoemFlow } from './savePoemFlow';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));
jest.mock('./savePoemFlow', () => ({ savePoemFlow: jest.fn() }));
jest.mock('@/components/admin/LazyRichTextEditor', () => ({ RichTextEditor: () => null }));

const poem: PoemRow = {
  id: 'p1',
  slug: 'autumn',
  title: 'Autumn',
  subtitle: null,
  content: '<p>leaves</p>',
  plain_text: 'leaves',
  status: 'published',
  published_at: '2026-01-01T00:00:00.000Z',
  pinned: false,
  notified_at: '2026-01-01T00:00:00.000Z',
  collection: 'main',
} as PoemRow;

const resolveSave = () =>
  (savePoemFlow as jest.Mock).mockResolvedValue({
    poem,
    flash: { title: 'Changes saved', tone: 'success' },
  });

describe('PoemEditor', () => {
  it('marks admin lists stale and caches the saved row from the server', async () => {
    const saved = { ...poem, title: 'Saved title' };
    (savePoemFlow as jest.Mock).mockResolvedValue({
      poem: saved,
      flash: { title: 'Changes saved', tone: 'success' },
    });
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<PoemEditor poem={poem} />);
    queryClient.setQueryData(queryKeys.admin.poems({ collection: 'main', status: null }), [poem]);
    queryClient.setQueryData(queryKeys.admin.poem('p1'), poem);

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/poems'));
    expect(savePoemFlow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1', notify: false })
    );
    expect(queryClient.getQueryState(queryKeys.admin.poems({ collection: 'main', status: null }))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(queryKeys.admin.poem('p1'))).toEqual(saved);
    expect(queryClient.getQueryState(queryKeys.admin.poem('p1'))?.isInvalidated).toBe(false);
  });

  it('saves a new poem into main unless told otherwise', async () => {
    resolveSave();
    const user = userEvent.setup();
    renderWithProviders(<PoemEditor poem={{ ...poem, collection: 'main' }} />);

    expect(screen.getByRole('radio', { name: 'Main' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(savePoemFlow).toHaveBeenCalledWith(
        expect.objectContaining({ poem: expect.objectContaining({ collection: 'main' }) })
      )
    );
  });

  it('saves a poem into the kinky collection when chosen', async () => {
    resolveSave();
    const user = userEvent.setup();
    renderWithProviders(<PoemEditor poem={poem} />);

    await user.click(screen.getByRole('radio', { name: 'Kinky' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(savePoemFlow).toHaveBeenCalledWith(
        expect.objectContaining({ poem: expect.objectContaining({ collection: 'kinky' }) })
      )
    );
  });

  it('never emails subscribers about a kinky poem', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PoemEditor poem={{ ...poem, notified_at: null }} />);

    const toggle = screen.getByRole('switch', { name: 'Email subscribers' });
    expect(toggle).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: 'Kinky' }));
    expect(toggle).toBeDisabled();
    expect(toggle).not.toBeChecked();
    expect(screen.getByText('Kinky poems are never emailed.')).toBeInTheDocument();
  });

  it('emails subscribers on creation by default, and the switch turns it off', async () => {
    resolveSave();
    const user = userEvent.setup();
    renderWithProviders(<PoemEditor />);
    await user.type(screen.getByPlaceholderText('Poem title...'), 'Dawn');
    await user.click(screen.getByRole('radio', { name: 'Published' }));

    const toggle = screen.getByRole('switch', { name: 'Email subscribers' });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
  });

  it('cannot email a draft, and says when it can', () => {
    renderWithProviders(<PoemEditor />);

    expect(screen.getByRole('switch', { name: 'Email subscribers' })).toBeDisabled();
    expect(screen.getByText('Sends when the poem is saved as Published.')).toBeInTheDocument();
  });

  it('cannot email a poem twice', () => {
    renderWithProviders(<PoemEditor poem={poem} />);

    expect(screen.getByRole('switch', { name: 'Email subscribers' })).toBeDisabled();
    expect(screen.getByText('Subscribers were already emailed about this poem.')).toBeInTheDocument();
  });
});
