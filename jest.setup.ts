import '@testing-library/jest-dom';

// Polyfill Response.json for jsdom (used by API utils like csrf.ts and rateLimit.ts)
if (typeof Response === 'undefined') {
  (globalThis as Record<string, unknown>).Response = class MockResponse {
    status: number;
    body: string;
    headers: Map<string, string>;

    constructor(body?: string | null, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body || '';
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }

    static json(data: unknown, init?: { status?: number }) {
      const response = new MockResponse(JSON.stringify(data), init);
      return response;
    }

    async json() {
      return JSON.parse(this.body);
    }
  };
}

// Polyfill window.matchMedia for jsdom (used by ThemeProvider)
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
