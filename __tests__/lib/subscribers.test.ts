/**
 * @jest-environment node
 */
import { unsubscribeByToken, upsertSubscriber } from '@/lib/subscribers';
import { createUnsubscribeToken } from '@/lib/unsubscribeToken';
import { clientMock, queryMock, type QueryResult } from '@/__tests__/supabaseMock';

type Client = Parameters<typeof upsertSubscriber>[0];

function setup(result: QueryResult) {
  const query = queryMock(result);
  const client = clientMock({ upsert_subscriber: [query] }) as unknown as Client;
  return { client, query };
}

const row = { id: 'sub-1', email: 'a@x.com', status: 'active' };

describe('upsertSubscriber', () => {
  it('makes one atomic call with the email and preference', async () => {
    const { client, query } = setup({ data: { outcome: 'inserted', subscriber: row } });

    await upsertSubscriber(client, 'A@x.com', false);

    expect(query.argsOf('rpc')[0][0]).toEqual({ p_email: 'A@x.com', p_notify_new_poems: false });
  });

  it('opts in to new-poem emails by default', async () => {
    const { client, query } = setup({ data: { outcome: 'inserted', subscriber: row } });

    await upsertSubscriber(client, 'a@x.com');

    expect(query.argsOf('rpc')[0][0]).toMatchObject({ p_notify_new_poems: true });
  });

  it.each(['inserted', 'reactivated'] as const)('answers %s with the row', async (outcome) => {
    const { client } = setup({ data: { outcome, subscriber: row } });

    expect(await upsertSubscriber(client, 'a@x.com')).toEqual({ outcome, subscriber: row });
  });

  it('answers already_active without a row', async () => {
    const { client } = setup({ data: { outcome: 'already_active', subscriber: null } });

    expect(await upsertSubscriber(client, 'a@x.com')).toEqual({ outcome: 'already_active' });
  });

  it('throws when the database fails', async () => {
    const { client } = setup({ error: { message: 'connection lost' } });

    await expect(upsertSubscriber(client, 'a@x.com')).rejects.toThrow('connection lost');
  });
});

describe('unsubscribeByToken', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  });

  it('unsubscribes the address the token was issued for', async () => {
    const query = queryMock();
    const client = clientMock({ subscribers: [query] }) as unknown as Client;

    const ok = await unsubscribeByToken(client, createUnsubscribeToken('reader@example.com'));

    expect(ok).toBe(true);
    expect(query.argsOf('update')).toEqual([[{ status: 'unsubscribed' }]]);
    expect(query.argsOf('eq')).toEqual([['email', 'reader@example.com']]);
  });

  it('touches nothing for a forged or missing token', async () => {
    const client = clientMock({});

    expect(await unsubscribeByToken(client as unknown as Client, 'attacker.forged')).toBe(false);
    expect(await unsubscribeByToken(client as unknown as Client, null)).toBe(false);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('throws on a database error instead of claiming success', async () => {
    const client = clientMock({ subscribers: [queryMock({ error: { message: 'connection lost' } })] });

    await expect(
      unsubscribeByToken(client as unknown as Client, createUnsubscribeToken('reader@example.com'))
    ).rejects.toThrow('connection lost');
  });
});
