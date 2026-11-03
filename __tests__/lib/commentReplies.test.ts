/**
 * @jest-environment node
 */
import { notifyCommentReply } from '@/lib/commentReplies';
import { generateCommentReplyEmail } from '@/lib/email';
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';

const mockSendEmail = jest.fn<Promise<{ id: string }>, [unknown]>(async () => ({ id: 'm1' }));
jest.mock('@/lib/email', () => ({
  ...jest.requireActual('@/lib/email'),
  sendEmail: (options: unknown) => mockSendEmail(options),
}));

let adminClient: ReturnType<typeof clientMock>;
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminClient,
}));

const SITE = 'https://www.blumenouspoetry.com';
const PARENT_ID = '11111111-1111-4111-8111-111111111111';

const reply = {
  parentId: PARENT_ID,
  authorName: 'Desmond',
  content: 'Thank you <3',
  replierEmail: null,
  poem: { title: 'Rain & Salt', slug: 'rain-and-salt', collection: 'main' as const },
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  mockSendEmail.mockClear();
});

describe('generateCommentReplyEmail', () => {
  const build = () => generateCommentReplyEmail({
    poemTitle: 'Rain & Salt',
    poemUrl: `${SITE}/poems/rain-and-salt`,
    originalContent: 'This one <b>hurt</b>.',
    replyAuthor: 'Desmond',
    replyContent: 'Thank you <3',
    unsubscribeEmail: 'ada@example.com',
  });
  let mail: ReturnType<typeof build>;
  beforeEach(() => {
    mail = build();
  });

  it('names who replied and on which poem', () => {
    expect(mail.subject).toBe('Desmond replied to your comment on “Rain & Salt”');
  });

  it('escapes visitor-written text in the html', () => {
    expect(mail.html).toContain('This one &lt;b&gt;hurt&lt;/b&gt;.');
    expect(mail.html).toContain('Thank you &lt;3');
    expect(mail.html).not.toContain('<b>hurt</b>');
  });

  it('links to the poem in html and text', () => {
    expect(mail.html).toContain(`${SITE}/poems/rain-and-salt`);
    expect(mail.text).toContain(`${SITE}/poems/rain-and-salt`);
  });

  it('carries a working unsubscribe link for the address, and no new-poem setting', () => {
    const token = mail.text.match(/\/api\/unsubscribe\?token=([A-Za-z0-9._-]+)/)?.[1];
    expect(token && verifyUnsubscribeToken(token)).toBe('ada@example.com');
    expect(mail.html).not.toContain('new-poem');
  });
});

describe('notifyCommentReply', () => {
  const withEmail = (data: unknown) => {
    const lookup = queryMock({ data });
    adminClient = clientMock({ comment_emails: [lookup] });
    return lookup;
  };

  it('emails the person the reply answers, with one-click unsubscribe headers', async () => {
    const lookup = withEmail({ email: 'ada@example.com', comment: { content: 'This one hurt.' } });

    await notifyCommentReply(reply);

    expect(lookup.argsOf('eq')).toEqual([['comment_id', PARENT_ID]]);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0]).toMatchObject({
      to: 'ada@example.com',
      subject: 'Desmond replied to your comment on “Rain & Salt”',
      headers: { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
  });

  it('sends nothing when the answered comment left no email', async () => {
    withEmail(null);
    await notifyCommentReply(reply);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when someone answers their own comment', async () => {
    withEmail({ email: 'ada@example.com', comment: { content: 'x' } });
    await notifyCommentReply({ ...reply, replierEmail: 'ada@example.com' });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('never throws: a failed send is logged, the reply already stands', async () => {
    withEmail({ email: 'ada@example.com', comment: { content: 'x' } });
    mockSendEmail.mockRejectedValueOnce(new Error('421 try later'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notifyCommentReply(reply)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
