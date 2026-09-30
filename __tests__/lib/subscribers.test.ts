/**
 * @jest-environment node
 */
import { upsertSubscriber } from '@/lib/subscribers';
import { clientMock, queryMock, type QueryResult } from '@/__tests__/supabaseMock';

type Client = Parameters<typeof upsertSubscriber>[0];
const dbError = { message: 'connection lost' };

/* The lookup query, then the write it leads to (update or insert). */
function setup(lookup: QueryResult, write: QueryResult = {}) {
  const find = queryMock(lookup);
  const save = queryMock(write);
  const client = clientMock({ subscribers: [find, save] }) as unknown as Client;
  return { client, find, save };
}

const saved = { id: 'sub-1', status: 'active' };

describe('upsertSubscriber', () => {
  it('lowercases the email before looking up an existing subscriber', async () => {
    const { client, find } = setup({ data: null }, { data: saved });

    await upsertSubscriber(client, 'Foo@Example.com', { status: 'active' });

    expect(find.argsOf('eq')).toEqual([['email', 'foo@example.com']]);
  });

  it('lowercases the email before inserting a new subscriber (the casing bug fix)', async () => {
    const { client, save } = setup({ data: null }, { data: saved });

    const result = await upsertSubscriber(client, 'Foo@Example.com', { status: 'active' });

    expect(save.argsOf('insert')).toEqual([
      [expect.objectContaining({ email: 'foo@example.com', status: 'active', verified: true })],
    ]);
    expect(result).toEqual({ outcome: 'inserted', subscriber: saved });
  });

  it('returns already_active without writing when the subscriber is already active', async () => {
    const { client, save } = setup({ data: { id: 'sub-1', status: 'active' } });

    const result = await upsertSubscriber(client, 'foo@example.com', { status: 'active' });

    expect(result).toEqual({ outcome: 'already_active' });
    expect(save.calls).toEqual([]);
  });

  it('reactivates an unsubscribed row using the caller-provided fields', async () => {
    const { client, save } = setup({ data: { id: 'sub-1', status: 'unsubscribed' } }, { data: saved });

    const result = await upsertSubscriber(client, 'foo@example.com', { status: 'active', verified: true });

    expect(save.argsOf('update')).toEqual([[{ status: 'active', verified: true, notify_new_poems: true }]]);
    expect(save.argsOf('eq')).toEqual([['id', 'sub-1']]);
    expect(save.argsOf('insert')).toEqual([]);
    expect(result).toEqual({ outcome: 'reactivated', subscriber: saved });
  });

  describe('database errors', () => {
    it('throws when the lookup fails, rather than inserting a duplicate', async () => {
      const { client, save } = setup({ error: dbError });

      await expect(upsertSubscriber(client, 'foo@example.com', { status: 'active' })).rejects.toThrow(
        'connection lost'
      );
      expect(save.calls).toEqual([]);
    });

    it('throws when the insert fails', async () => {
      const { client } = setup({ data: null }, { error: dbError });

      await expect(upsertSubscriber(client, 'foo@example.com', { status: 'active' })).rejects.toThrow(
        'connection lost'
      );
    });

    it('throws when the reactivation fails', async () => {
      const { client } = setup({ data: { id: 'sub-1', status: 'unsubscribed' } }, { error: dbError });

      await expect(upsertSubscriber(client, 'foo@example.com', { status: 'active' })).rejects.toThrow(
        'connection lost'
      );
    });
  });

  describe('new-poem notification preference', () => {
    it('opts a new subscriber in by default', async () => {
      const { client, save } = setup({ data: null }, { data: saved });

      await upsertSubscriber(client, 'foo@example.com', { status: 'active' });

      expect(save.argsOf('insert')).toEqual([[expect.objectContaining({ notify_new_poems: true })]]);
    });

    it('records a new subscriber who declined', async () => {
      const { client, save } = setup({ data: null }, { data: saved });

      await upsertSubscriber(client, 'foo@example.com', { status: 'active' }, false);

      expect(save.argsOf('insert')).toEqual([[expect.objectContaining({ notify_new_poems: false })]]);
    });

    it('applies the choice when reactivating, so an old preference cannot override a fresh one', async () => {
      const { client, save } = setup({ data: { id: 'sub-1', status: 'unsubscribed' } }, { data: saved });

      await upsertSubscriber(client, 'foo@example.com', { status: 'active' }, false);

      expect(save.argsOf('update')).toEqual([[expect.objectContaining({ notify_new_poems: false })]]);
    });
  });
});
