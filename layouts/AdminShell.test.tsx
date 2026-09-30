import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminShell } from './AdminShell';
import type { NavDestination } from './nav';

jest.mock('next/navigation', () => ({ usePathname: () => '/admin/poems' }));

const destinations: NavDestination[] = [
  { href: '/admin', label: 'Dashboard', icon: <svg />, exact: true },
  { href: '/admin/poems', label: 'Poems', icon: <svg /> },
];

function renderShell(onSignOut = jest.fn()) {
  render(
    <AdminShell
      destinations={destinations}
      actions={<button>Stateful action</button>}
      account={{ email: 'poet@example.com', onSignOut }}
    >
      <p>page</p>
    </AdminShell>
  );
  return onSignOut;
}

describe('AdminShell', () => {
  it('mounts header actions exactly once at every width', () => {
    renderShell();
    expect(screen.getAllByRole('button', { name: 'Stateful action' })).toHaveLength(1);
  });

  it('renders the page inside main', () => {
    renderShell();
    expect(within(screen.getByRole('main')).getByText('page')).toBeInTheDocument();
  });

  it('marks the current destination in both navigations from one list', () => {
    renderShell();
    const desktop = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(desktop).getByRole('link', { name: 'Poems' })).toHaveAttribute('aria-current', 'page');
    expect(within(desktop).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('signs out from the account controls', async () => {
    const onSignOut = renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Sign Out' }));
    expect(onSignOut).toHaveBeenCalled();
  });
});
