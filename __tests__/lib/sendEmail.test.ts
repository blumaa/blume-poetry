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

async function loadSendEmail() {
  let mod!: typeof import('@/lib/email');
  await jest.isolateModulesAsync(async () => {
    mod = await import('@/lib/email');
  });
  return mod.sendEmail;
}

const message = { to: 'reader@example.com', subject: 'New poem', html: '<p>hi</p>' };

beforeEach(() => {
  process.env.GMAIL_USER = 'poet@example.com';
  process.env.GMAIL_APP_PASSWORD = 'secret';
  jest.useFakeTimers();
  sendMail.mockReset();
  createTransport.mockReset().mockReturnValue({ sendMail });
});

afterEach(() => {
  jest.useRealTimers();
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
