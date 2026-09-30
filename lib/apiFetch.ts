/* The one client-side wrapper for calls to our own /api routes. Routes answer
   errors as { error: string }; that message becomes the thrown ApiError, so
   callers show it as-is instead of each re-parsing the response. */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiFetchInit extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
  /** Serialized as the JSON request body. */
  json?: unknown;
}

function errorMessage(body: unknown): string | null {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return null;
}

export async function apiFetch<T = unknown>(url: string, init: ApiFetchInit = {}): Promise<T> {
  const { json, headers = {}, ...rest } = init;
  const request: RequestInit =
    json === undefined
      ? { ...rest, headers }
      : {
          ...rest,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        };

  const res = await fetch(url, request);
  // Empty or non-JSON bodies (204, a proxy's HTML error page) read as null.
  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(errorMessage(body) ?? `Request failed (${res.status})`, res.status);
  }
  return body as T;
}
