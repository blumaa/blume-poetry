import { readPreference, writePreference } from './preferences';

const fetchMock = jest.fn();
const respond = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('readPreference', () => {
  it('reads by token and keeps only the preference', async () => {
    fetchMock.mockResolvedValue(
      respond(200, { enabled: true, unsubscribed: false, email: 'a@example.com' })
    );

    await expect(readPreference('t/1')).resolves.toEqual({ enabled: true, unsubscribed: false });
    expect(fetchMock).toHaveBeenCalledWith('/api/notifications?token=t%2F1', expect.anything());
  });

  it("throws the route's message", async () => {
    fetchMock.mockResolvedValue(respond(400, { error: 'This link is no longer valid' }));
    await expect(readPreference('t')).rejects.toThrow('This link is no longer valid');
  });
});

describe('writePreference', () => {
  it('posts the absolute value and returns what the server stored', async () => {
    fetchMock.mockResolvedValue(respond(200, { enabled: false, unsubscribed: true, email: 'x' }));

    await expect(writePreference('t', 'off')).resolves.toEqual({ enabled: false, unsubscribed: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/notifications');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ token: 't', action: 'off' });
  });

  it("throws the route's message", async () => {
    fetchMock.mockResolvedValue(respond(404, { error: 'We could not find that subscription' }));
    await expect(writePreference('t', 'on')).rejects.toThrow('We could not find that subscription');
  });
});
