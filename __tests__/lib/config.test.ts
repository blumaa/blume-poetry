describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getAdminEmail', () => {
    it('returns ADMIN_EMAIL when set', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      delete process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const { getAdminEmail } = await import('@/lib/config');
      expect(getAdminEmail()).toBe('admin@test.com');
    });

    it('falls back to NEXT_PUBLIC_ADMIN_EMAIL', async () => {
      delete process.env.ADMIN_EMAIL;
      process.env.NEXT_PUBLIC_ADMIN_EMAIL = 'public@test.com';
      const { getAdminEmail } = await import('@/lib/config');
      expect(getAdminEmail()).toBe('public@test.com');
    });

    it('returns undefined when neither is set', async () => {
      delete process.env.ADMIN_EMAIL;
      delete process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const { getAdminEmail } = await import('@/lib/config');
      expect(getAdminEmail()).toBeUndefined();
    });
  });

  describe('isAdminEmail', () => {
    it('returns true for matching email', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      const { isAdminEmail } = await import('@/lib/config');
      expect(isAdminEmail('admin@test.com')).toBe(true);
    });

    it('returns false for non-matching email', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      const { isAdminEmail } = await import('@/lib/config');
      expect(isAdminEmail('other@test.com')).toBe(false);
    });

    it('returns false for null/undefined email', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      const { isAdminEmail } = await import('@/lib/config');
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
    });

    it('returns false when admin email is not configured', async () => {
      delete process.env.ADMIN_EMAIL;
      delete process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const { isAdminEmail } = await import('@/lib/config');
      expect(isAdminEmail('any@test.com')).toBe(false);
    });
  });

  describe('getSiteUrl', () => {
    it('returns NEXT_PUBLIC_SITE_URL when set', async () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://custom.com';
      const { getSiteUrl } = await import('@/lib/config');
      expect(getSiteUrl()).toBe('https://custom.com');
    });

    it('returns default when not set', async () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const { getSiteUrl } = await import('@/lib/config');
      expect(getSiteUrl()).toBe('https://blumenous-poetry.vercel.app');
    });
  });
});
