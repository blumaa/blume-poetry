/**
 * @jest-environment node
 */
import { upsertSubscriber } from '@/lib/subscribers';

function buildClient(existing: { id: string; status: string } | null) {
  const singleExisting = jest.fn(async () => ({ data: existing, error: null }));
  const eqExisting = jest.fn(() => ({ single: singleExisting }));
  const selectExisting = jest.fn(() => ({ eq: eqExisting }));

  const singleInsert = jest.fn(async () => ({ data: { id: 'new-1' }, error: null }));
  const selectInsert = jest.fn(() => ({ single: singleInsert }));
  const insert = jest.fn(() => ({ select: selectInsert }));

  const singleUpdate = jest.fn(async () => ({ data: { id: existing?.id, status: 'active' }, error: null }));
  const selectUpdate = jest.fn(() => ({ single: singleUpdate }));
  const eqUpdate = jest.fn(() => ({ select: selectUpdate }));
  const update = jest.fn(() => ({ eq: eqUpdate }));

  const from = jest.fn(() => ({ select: selectExisting, insert, update }));
  const client = { from } as unknown as Parameters<typeof upsertSubscriber>[0];

  return { client, selectExisting, eqExisting, insert, update, eqUpdate };
}

describe('upsertSubscriber', () => {
  it('lowercases the email before looking up an existing subscriber', async () => {
    const { client, eqExisting } = buildClient(null);

    await upsertSubscriber(client, 'Foo@Example.com', { status: 'active' });

    expect(eqExisting).toHaveBeenCalledWith('email', 'foo@example.com');
  });

  it('lowercases the email before inserting a new subscriber (the casing bug fix)', async () => {
    const { client, insert } = buildClient(null);

    const result = await upsertSubscriber(client, 'Foo@Example.com', { status: 'active' });

    expect(insert).toHaveBeenCalledWith({ email: 'foo@example.com', status: 'active', verified: true });
    expect(result).toEqual({ outcome: 'inserted', data: { id: 'new-1' }, error: null });
  });

  it('returns already_active without writing when the subscriber is already active', async () => {
    const { client, insert, update } = buildClient({ id: 'sub-1', status: 'active' });

    const result = await upsertSubscriber(client, 'foo@example.com', { status: 'active' });

    expect(result).toEqual({ outcome: 'already_active' });
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('reactivates an unsubscribed row using the caller-provided fields', async () => {
    const { client, eqUpdate, update, insert } = buildClient({ id: 'sub-1', status: 'unsubscribed' });

    const result = await upsertSubscriber(client, 'foo@example.com', { status: 'active', verified: true });

    expect(update).toHaveBeenCalledWith({ status: 'active', verified: true });
    expect(eqUpdate).toHaveBeenCalledWith('id', 'sub-1');
    expect(insert).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: 'reactivated', data: { id: 'sub-1', status: 'active' }, error: null });
  });
});
