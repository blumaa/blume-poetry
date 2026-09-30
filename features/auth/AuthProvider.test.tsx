import { screen } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { renderWithProviders } from '@/__tests__/test-utils';
import { AuthProvider, useAuth } from './AuthProvider';

let currentUser: User | null = null;
const checkAdmin = jest.fn(async () => true);

jest.mock('./api/auth', () => ({
  watchUser: (onChange: (user: User | null) => void) => {
    onChange(currentUser);
    return () => {};
  },
  checkAdmin: () => checkAdmin(),
  signOut: async () => {},
}));

function Probe() {
  const { user, isLoading, isAdmin } = useAuth();
  if (isLoading) return <p>loading</p>;
  return <p>{`${user?.email ?? 'nobody'} admin=${isAdmin}`}</p>;
}

describe('AuthProvider', () => {
  beforeEach(() => checkAdmin.mockClear());

  it('asks the server whether the signed-in user is admin', async () => {
    currentUser = { id: 'u1', email: 'me@site.test' } as User;

    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(await screen.findByText('me@site.test admin=true')).toBeInTheDocument();
    expect(checkAdmin).toHaveBeenCalledTimes(1);
  });

  it('is not admin when signed out, without asking the server', async () => {
    currentUser = null;

    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(await screen.findByText('nobody admin=false')).toBeInTheDocument();
    expect(checkAdmin).not.toHaveBeenCalled();
  });
});
