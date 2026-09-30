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
jest.mock('@/components/admin/RichTextEditor', () => ({ RichTextEditor: () => null }));

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
} as PoemRow;

describe('PoemEditor', () => {
  it('marks cached admin poem reads stale after a save', async () => {
    (savePoemFlow as jest.Mock).mockResolvedValue({ title: 'Changes saved', tone: 'success' });
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<PoemEditor poem={poem} />);
    queryClient.setQueryData(queryKeys.admin.poems(null), [poem]);
    queryClient.setQueryData(queryKeys.admin.poem('p1'), poem);

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/poems'));
    expect(savePoemFlow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1', notify: false })
    );
    expect(queryClient.getQueryState(queryKeys.admin.poems(null))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(queryKeys.admin.poem('p1'))?.isInvalidated).toBe(true);
  });
});
