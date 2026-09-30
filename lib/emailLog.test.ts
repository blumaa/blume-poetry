/**
 * @jest-environment node
 */
import { recordEmailSend } from './emailLog';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

type Client = Parameters<typeof recordEmailSend>[0];
const entry = { subject: 'Tide', poem_id: 'poem-1', recipient_count: 2, status: 'sent' };

afterEach(() => jest.restoreAllMocks());

describe('recordEmailSend', () => {
  it('inserts the entry into email_logs', async () => {
    const insert = queryMock();
    const client = clientMock({ email_logs: [insert] });

    await recordEmailSend(client as unknown as Client, entry);

    expect(insert.argsOf('insert')).toEqual([[entry]]);
  });

  it('reports a failed write without throwing, since the emails already went out', async () => {
    const client = clientMock({ email_logs: [queryMock({ error: { message: 'connection lost' } })] });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(recordEmailSend(client as unknown as Client, entry)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      'Failed to record email send:',
      expect.objectContaining({ message: 'connection lost' })
    );
  });
});
