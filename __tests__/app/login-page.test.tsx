/**
 * @jest-environment node
 */
import LoginPage from '@/app/login/page';

let currentUser: { email: string } | null = null;

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  }),
}));

const redirectMock = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

jest.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /admin when a session already exists', async () => {
    currentUser = { email: 'admin@site.test' };
    await expect(LoginPage()).rejects.toThrow('NEXT_REDIRECT:/admin');
    expect(redirectMock).toHaveBeenCalledWith('/admin');
  });

  it('renders the login form when there is no session', async () => {
    currentUser = null;
    await expect(LoginPage()).resolves.toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
