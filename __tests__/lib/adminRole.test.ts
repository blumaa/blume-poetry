import { hasAdminRole } from '@/lib/adminRole';

describe('hasAdminRole', () => {
  it('is true for the admin role in app_metadata', () => {
    expect(hasAdminRole({ app_metadata: { role: 'admin' } })).toBe(true);
  });

  it('is false for any other role, none, or no user', () => {
    expect(hasAdminRole({ app_metadata: { role: 'editor' } })).toBe(false);
    expect(hasAdminRole({ app_metadata: {} })).toBe(false);
    expect(hasAdminRole({})).toBe(false);
    expect(hasAdminRole(null)).toBe(false);
    expect(hasAdminRole(undefined)).toBe(false);
  });

  it('ignores user_metadata, which the user can write', () => {
    expect(hasAdminRole({ user_metadata: { role: 'admin' } } as never)).toBe(false);
  });
});
