import {
  generatePoemEmailHtml,
  generatePoemEmailText,
  generateNewsletterHtml,
  generateNewsletterText,
} from '@/lib/email';
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken';
import { verifyEmailToken } from '@/lib/emailToken';
import { POEM_EMAIL_MEASURE_PX } from '@/lib/poemHtml';

const SITE = 'https://www.blumenouspoetry.com';

/** Outer width of the email shell, as declared in the rendered markup. */
function shellWidth(html: string): number {
  const match = html.match(/max-width: (\d+)px; margin: 0 auto; padding: (\d+)px (\d+)px/);
  if (!match) throw new Error('no email shell found');
  return Number(match[1]);
}

/**
 * Width left for text once the card padding is taken out. The shell's own
 * padding sits outside its max-width: email has no border-box reset.
 */
function shellTextWidth(html: string): number {
  const shell = html.match(/max-width: (\d+)px; margin: 0 auto/);
  const card = html.match(/background-color: #ffffff; padding: (\d+)px/);
  if (!shell || !card) throw new Error('no email shell found');
  return Number(shell[1]) - 2 * Number(card[1]);
}

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

describe('new-poem notification links', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  });

  const email = 'Reader@Example.com';

  function extractNotificationsUrl(body: string): string {
    const match = body.match(/\/notifications\?token=[A-Za-z0-9._-]+(&action=(on|off))?/);
    if (!match) throw new Error(`no notifications url found in: ${body.slice(0, 200)}`);
    return match[0];
  }

  const poemArgs = { title: 'T', content: 'c', slug: 's', unsubscribeEmail: email };
  const newsletterArgs = { subject: 'S', bodyHtml: '<p>b</p>', bodyText: 'b', unsubscribeEmail: email };

  const cases: Array<[string, () => string, 'off' | 'none']> = [
    ['generatePoemEmailHtml', () => generatePoemEmailHtml(poemArgs), 'off'],
    ['generatePoemEmailText', () => generatePoemEmailText(poemArgs), 'off'],
    ['generateNewsletterHtml', () => generateNewsletterHtml(newsletterArgs), 'none'],
    ['generateNewsletterText', () => generateNewsletterText(newsletterArgs), 'none'],
  ];

  it.each(cases)('%s links to the settings page with a signed token', (_name, gen) => {
    const body = gen();
    const url = extractNotificationsUrl(body);

    expect(body).toContain(`${SITE}/notifications?token=`);
    expect(url).not.toContain('Reader');
    expect(url).not.toContain('%40');

    const token = new URLSearchParams(url.split('?')[1]).get('token')!;
    expect(verifyEmailToken(token, 'notifications')).toBe('reader@example.com');
  });

  it.each(cases)('%s names the right action for its kind', (_name, gen, expected) => {
    const url = extractNotificationsUrl(gen());

    if (expected === 'off') {
      // A poem notification offers the way out directly.
      expect(url).toContain('&action=off');
    } else {
      // Everything else lands on the settings page and changes nothing.
      expect(url).not.toContain('&action=');
    }
  });

  it.each(cases)('%s keeps the notification token out of the unsubscribe endpoint', (_name, gen) => {
    const url = extractNotificationsUrl(gen());
    const token = new URLSearchParams(url.split('?')[1]).get('token')!;

    // Purpose scoping: a notifications token must not double as an unsubscribe.
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it('still offers a separate unsubscribe-from-everything link', () => {
    const html = generatePoemEmailHtml(poemArgs);

    expect(html).toContain('Unsubscribe from all emails');
    expect(html).toContain('Turn off new-poem emails');
  });
});

describe('attached poems render the same content the site does', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  });

  const poem = {
    title: 'Tide',
    // Six lines, so the half an email sends still carries a blank line and an indent.
    content: '<p>a <em>slow</em> line</p><p><br></p><p>  the turn</p><p>and</p><p><br></p><p>back</p>',
    slug: 'tide',
  };

  it('keeps the stored markup instead of escaping it into the body', () => {
    const html = generateNewsletterHtml({
      subject: 'S',
      bodyHtml: '<p>b</p>',
      bodyText: 'b',
      poem,
      unsubscribeEmail: 'reader@example.com',
    });

    expect(html).toContain('<em');
    expect(html).not.toContain('&lt;p&gt;');
    expect(html).not.toContain('&lt;em&gt;');
  });

  it('preserves blank lines and indentation from the poem', () => {
    const html = generateNewsletterHtml({
      subject: 'S',
      bodyHtml: '<p>b</p>',
      bodyText: 'b',
      poem,
      unsubscribeEmail: 'reader@example.com',
    });

    // Three paragraphs: line, blank line, indented line
    expect(html.match(/<p style="margin:0/g)).toHaveLength(3);
    expect(html).toContain('  the turn');
  });

  it('gives the poem the same measure the site gives it, so lines break alike', () => {
    const html = generatePoemEmailHtml({ ...poem, unsubscribeEmail: 'reader@example.com' });

    expect(shellTextWidth(html)).toBe(POEM_EMAIL_MEASURE_PX);
  });

  it('leaves plain newsletters at the standard email width', () => {
    const html = generateNewsletterHtml({
      subject: 'S',
      bodyHtml: '<p>b</p>',
      bodyText: 'b',
      unsubscribeEmail: 'reader@example.com',
    });

    expect(shellWidth(html)).toBe(600);
  });

  it('widens a newsletter that carries a poem', () => {
    const html = generateNewsletterHtml({
      subject: 'S',
      bodyHtml: '<p>b</p>',
      bodyText: 'b',
      poem,
      unsubscribeEmail: 'reader@example.com',
    });

    expect(shellTextWidth(html)).toBe(POEM_EMAIL_MEASURE_PX);
  });

  it('flattens the poem to readable lines in the text alternative', () => {
    const text = generateNewsletterText({
      subject: 'S',
      bodyHtml: '<p>b</p>',
      bodyText: 'b',
      poem,
      unsubscribeEmail: 'reader@example.com',
    });

    expect(text).toContain('a slow line\n\n  the turn');
    expect(text).not.toContain('<p>');
  });
});

describe('an emailed poem is an excerpt', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  });

  const poem = {
    title: 'Tide',
    content: '<p>one</p><p>two</p><p>three</p><p>four</p>',
    slug: 'tide',
  };

  const newsletter = {
    subject: 'S',
    bodyHtml: '<p>b</p>',
    bodyText: 'b',
    poem,
    unsubscribeEmail: 'reader@example.com',
  };

  const cases: Array<[string, () => string]> = [
    ['generatePoemEmailHtml', () => generatePoemEmailHtml({ ...poem, unsubscribeEmail: 'reader@example.com' })],
    ['generatePoemEmailText', () => generatePoemEmailText({ ...poem, unsubscribeEmail: 'reader@example.com' })],
    ['generateNewsletterHtml', () => generateNewsletterHtml(newsletter)],
    ['generateNewsletterText', () => generateNewsletterText(newsletter)],
  ];

  it.each(cases)('%s sends half the poem and links to the rest', (_name, gen) => {
    const body = gen();

    expect(body).toContain('one');
    expect(body).toContain('two');
    expect(body).not.toContain('three');
    expect(body).not.toContain('four');

    expect(body).toContain('Continue reading on blumenouspoetry.com');
    expect(body).toContain(`${SITE}/poem/tide`);
  });

  it('names the site plainly when there is nothing left to cut', () => {
    const html = generatePoemEmailHtml({
      title: 'One',
      content: '<p>only</p>',
      slug: 'one',
      unsubscribeEmail: 'reader@example.com',
    });

    expect(html).toContain('only');
    expect(html).toContain('Read on Blumenous Poetry');
    expect(html).not.toContain('Continue reading');
  });
});
