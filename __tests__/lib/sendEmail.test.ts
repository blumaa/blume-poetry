/**
 * @jest-environment node
 *
 * Gmail turns away bursts of parallel sends with `421 4.3.0 Temporary System
 * Problem`. Two properties keep a whole-list send from losing readers to it:
 *  - one pooled transport, so mail shares a few SMTP connections instead of
 *    opening one per recipient
 *  - a temporary (4xx) refusal is retried; a permanent (5xx) one is not
 */
import nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));

const createTransport = nodemailer.createTransport as jest.Mock;
const sendMail = jest.fn();

function smtpError(responseCode: number) {
  return Object.assign(new Error(`SMTP ${responseCode}`), { responseCode });
}

async function loadEmail() {
  let mod!: typeof import('@/lib/email');
  await jest.isolateModulesAsync(async () => {
    mod = await import('@/lib/email');
  });
  return mod;
}

async function loadSendEmail() {
  return (await loadEmail()).sendEmail;
}

const message = { to: 'reader@example.com', subject: 'New poem', html: '<p>hi</p>' };

beforeEach(() => {
  process.env.GMAIL_USER = 'poet@example.com';
  process.env.GMAIL_APP_PASSWORD = 'secret';
  process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://site.test';
  jest.useFakeTimers();
  sendMail.mockReset();
  createTransport.mockReset().mockReturnValue({ sendMail });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('sendEmail', () => {
  it('sends over a pooled SMTP transport', async () => {
    sendMail.mockResolvedValue({ messageId: 'id-1' });
    const sendEmail = await loadSendEmail();

    await sendEmail(message);

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ pool: true }));
  });

  it('retries a temporary refusal and then delivers', async () => {
    sendMail.mockRejectedValueOnce(smtpError(421)).mockResolvedValueOnce({ messageId: 'id-2' });
    const sendEmail = await loadSendEmail();

    const result = sendEmail(message);
    await jest.runAllTimersAsync();

    await expect(result).resolves.toEqual({ id: 'id-2' });
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('gives up after repeated temporary refusals', async () => {
    sendMail.mockRejectedValue(smtpError(421));
    const sendEmail = await loadSendEmail();

    const result = sendEmail(message);
    const settled = expect(result).rejects.toMatchObject({ responseCode: 421 });
    await jest.runAllTimersAsync();

    await settled;
    expect(sendMail).toHaveBeenCalledTimes(3);
  });

  it('does not retry a permanent refusal', async () => {
    sendMail.mockRejectedValue(smtpError(550));
    const sendEmail = await loadSendEmail();

    await expect(sendEmail(message)).rejects.toMatchObject({ responseCode: 550 });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});

/* A whole-list send: every recipient gets their own mail, one failure does not
   stop the rest, and each mail names its one-click unsubscribe (RFC 8058) so
   Gmail and Yahoo accept bulk mail and show their own unsubscribe button. */
describe('sendToSubscribers', () => {
  const build = (email: string) => ({ subject: 'New poem', html: `<p>${email}</p>`, text: email });

  it('sends one mail per recipient with one-click unsubscribe headers', async () => {
    sendMail.mockResolvedValue({ messageId: 'id' });
    const { sendToSubscribers } = await loadEmail();

    const result = await sendToSubscribers(['a@example.com', 'b@example.com'], build);

    expect(result).toEqual({ sent: 2, failed: [] });
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('a@example.com');
    expect(mail.headers['List-Unsubscribe']).toMatch(
      /^<https:\/\/site\.test\/api\/unsubscribe\?token=.+>$/
    );
    expect(mail.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('counts a failed recipient and keeps sending to the rest', async () => {
    sendMail.mockRejectedValueOnce(smtpError(550)).mockResolvedValue({ messageId: 'id' });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { sendToSubscribers } = await loadEmail();

    const result = await sendToSubscribers(['a@example.com', 'b@example.com'], build);

    expect(result).toEqual({ sent: 1, failed: ['a@example.com'] });
  });
});
