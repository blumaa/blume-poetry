import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { SidebarWrapper } from './SidebarWrapper';
import { MOBILE_QUERY } from '@/lib/mediaQueries';
import type { TreeNode } from '@/lib/poems';

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('./MobileHeader', () => ({
  MobileHeader: ({ onMenuClick }: { onMenuClick: () => void }) => (
    <button onClick={onMenuClick}>Open menu</button>
  ),
}));

const tree: TreeNode[] = [{ id: 'poem-a', label: 'Poem A', type: 'poem', slug: 'poem-a' }];

/* A matchMedia whose MOBILE_QUERY result can be flipped, like resizing. */
function mockViewport(mobile: boolean) {
  let matches = mobile;
  const listeners = new Set<() => void>();
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return query === MOBILE_QUERY && matches;
      },
      media: query,
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }) as unknown as MediaQueryList;
  return (next: boolean) => {
    matches = next;
    listeners.forEach((listener) => listener());
  };
}

describe('SidebarWrapper', () => {
  it('mounts one sidebar on mobile', () => {
    mockViewport(true);
    renderWithProviders(<SidebarWrapper tree={tree} />);
    expect(screen.getAllByRole('complementary')).toHaveLength(1);
    expect(screen.getAllByRole('searchbox', { name: 'Search poems' })).toHaveLength(1);
  });

  it('keeps sidebar state across a mobile/desktop switch', async () => {
    const resize = mockViewport(false);
    renderWithProviders(<SidebarWrapper tree={tree} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search poems' }), 'moon');

    act(() => resize(true));

    expect(screen.getByRole('searchbox', { name: 'Search poems' })).toHaveValue('moon');
  });
});
