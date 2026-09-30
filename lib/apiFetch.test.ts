import { apiFetch, ApiError } from './apiFetch';

function respond(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input');
      return body;
    },
  };
}

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('apiFetch', () => {
  it('returns the parsed JSON body', async () => {
    fetchMock.mockResolvedValue(respond(200, { count: 3 }));
    await expect(apiFetch<{ count: number }>('/api/x')).resolves.toEqual({ count: 3 });
    expect(fetchMock).toHaveBeenCalledWith('/api/x', { headers: {} });
  });

  it('sends a JSON body with its content type', async () => {
    fetchMock.mockResolvedValue(respond(200, {}));
    await apiFetch('/api/x', { method: 'POST', json: { a: 1 }, headers: { 'x-visitor-id': 'v' } });
    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      method: 'POST',
      headers: { 'x-visitor-id': 'v', 'Content-Type': 'application/json' },
      body: '{"a":1}',
    });
  });

  it("throws the server's error message with the status", async () => {
    fetchMock.mockResolvedValue(respond(429, { error: 'Please take your time' }));
    const error = await apiFetch('/api/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'Please take your time', status: 429 });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    await expect(apiFetch('/api/x')).rejects.toThrow('Request failed (502)');
  });

  it('returns null for an empty success body', async () => {
    fetchMock.mockResolvedValue(respond(204, undefined));
    await expect(apiFetch('/api/x')).resolves.toBeNull();
  });
});
