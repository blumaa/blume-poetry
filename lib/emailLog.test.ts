/**
 * @jest-environment node
 *
 * A whole-list send is logged before the first mail and finished after the
 * last, so a send that dies partway still shows in email_logs as "sending".
 */
import { finishEmailLog, startEmailLog } from './emailLog';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

type Client = Parameters<typeof startEmailLog>[0];

afterEach(() => jest.restoreAllMocks());

describe('startEmailLog', () => {
  it('records the send as "sending" and returns its id', async () => {
    const insert = queryMock({ data: { id: 'log-1' } });
    const client = clientMock({ email_logs: [insert] });

    const id = await startEmailLog(client as unknown as Client, { subject: 'Tide', poem_id: 'poem-1' });

    expect(id).toBe('log-1');
    expect(insert.argsOf('insert')).toEqual([[{ subject: 'Tide', poem_id: 'poem-1', status: 'sending' }]]);
  });

  it('throws when the log cannot be written, since nothing has been sent yet', async () => {
    const client = clientMock({ email_logs: [queryMock({ error: { message: 'connection lost' } })] });

    await expect(
      startEmailLog(client as unknown as Client, { subject: 'Tide', poem_id: null })
    ).rejects.toThrow('connection lost');
  });
});

describe('finishEmailLog', () => {
  it.each([
    [{ sent: 2, failed: [] }, 'sent'],
    [{ sent: 1, failed: ['b@example.com'] }, 'partial'],
    [{ sent: 0, failed: ['a@example.com'] }, 'failed'],
  ] as const)('records %j as %s', async (result, status) => {
    const update = queryMock();
    const client = clientMock({ email_logs: [update] });

    await finishEmailLog(client as unknown as Client, 'log-1', { sent: result.sent, failed: [...result.failed] });

    expect(update.argsOf('update')).toEqual([[{ status, recipient_count: result.sent }]]);
    expect(update.argsOf('eq')).toEqual([['id', 'log-1']]);
  });

  it('reports a failed write without throwing, since the emails already went out', async () => {
    const client = clientMock({ email_logs: [queryMock({ error: { message: 'connection lost' } })] });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      finishEmailLog(client as unknown as Client, 'log-1', { sent: 1, failed: [] })
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      'Failed to finish email log:',
      expect.objectContaining({ message: 'connection lost' })
    );
  });
});
