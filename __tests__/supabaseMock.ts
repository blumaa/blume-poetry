/* A stand-in for a supabase-js query builder. Every builder method (select,
   eq, insert, maybeSingle, ...) returns the same chain and is recorded in
   `calls`; awaiting the chain runs the "query" and resolves with `result`.
   After throwOnError() a result carrying an error rejects instead, as
   supabase-js does. */

export interface QueryResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

export type QueryMock = PromiseLike<Required<QueryResult>> & {
  calls: Array<[method: string, args: unknown[]]>;
  /** Arguments of every call to `method`, in order. */
  argsOf(method: string): unknown[][];
} & Record<string, (...args: unknown[]) => QueryMock>;

export function queryMock(result: QueryResult = {}): QueryMock {
  const calls: QueryMock['calls'] = [];
  let throwing = false;

  const chain: QueryMock = new Proxy({} as QueryMock, {
    get(_target, prop) {
      if (prop === 'calls') return calls;
      if (prop === 'argsOf') {
        return (method: string) => calls.filter(([m]) => m === method).map(([, args]) => args);
      }
      if (prop === 'then') {
        const settled = { data: null, error: null, count: null, ...result };
        const outcome =
          throwing && settled.error
            ? Promise.reject(Object.assign(new Error(settled.error.message), settled.error))
            : Promise.resolve(settled);
        return outcome.then.bind(outcome);
      }
      return (...args: unknown[]) => {
        calls.push([String(prop), args]);
        if (prop === 'throwOnError') throwing = true;
        return chain;
      };
    },
  });
  return chain;
}

/** A client whose from(table) hands out the queued queries for that table, in order. */
export function clientMock(queries: Record<string, QueryMock[]>) {
  const queues = Object.fromEntries(Object.entries(queries).map(([table, q]) => [table, [...q]]));
  const from = jest.fn((table: string) => {
    const next = queues[table]?.shift();
    if (!next) throw new Error(`Unexpected query on "${table}"`);
    return next;
  });
  return { from };
}
