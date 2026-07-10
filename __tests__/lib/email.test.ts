import {
  generatePoemEmailHtml,
  generatePoemEmailText,
  generateNewsletterHtml,
  generateNewsletterText,
} from '@/lib/email';
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken';

const SITE = 'https://www.blumenouspoetry.com';

function extractUnsubscribeUrl(body: string): string {
  const match = body.match(/\/api\/unsubscribe\?token=[A-Za-z0-9._-]+/);
  if (!match) throw new Error(`no unsubscribe url found in: ${body.slice(0, 200)}`);
  return match[0];
}

function extractToken(url: string): string {
  return new URLSearchParams(url.split('?')[1]).get('token')!;
}

describe('email unsubscribe links', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  });

  const email = 'Reader@Example.com';

  const cases: Array<[string, () => string]> = [
    ['generatePoemEmailHtml', () => generatePoemEmailHtml({ title: 'T', content: 'c', slug: 's', unsubscribeEmail: email })],
    ['generatePoemEmailText', () => generatePoemEmailText({ title: 'T', content: 'c', slug: 's', unsubscribeEmail: email })],
    ['generateNewsletterHtml', () => generateNewsletterHtml({ subject: 'S', bodyHtml: '<p>b</p>', bodyText: 'b', unsubscribeEmail: email })],
    ['generateNewsletterText', () => generateNewsletterText({ subject: 'S', bodyHtml: '<p>b</p>', bodyText: 'b', unsubscribeEmail: email })],
  ];

  it.each(cases)('%s uses getSiteUrl and a signed token, not the raw email', (_name, gen) => {
    const body = gen();

    // Uses the configured site URL
    expect(body).toContain(`${SITE}/api/unsubscribe?token=`);

    // Never leaks the raw email into the unsubscribe link
    const url = extractUnsubscribeUrl(body);
    expect(url).not.toContain('Reader');
    expect(url).not.toContain('%40'); // encoded @

    // The token verifies back to the normalized email
    expect(verifyUnsubscribeToken(extractToken(url))).toBe('reader@example.com');
  });
});
