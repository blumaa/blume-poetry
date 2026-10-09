describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
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
