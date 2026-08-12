import nodemailer from 'nodemailer';
import { escapeHtml, sanitizeNewsletterHtml } from './sanitize';
import {
  POEM_EMAIL_MEASURE_PX,
  POEM_FONT_STACK,
  renderPoemHtmlForEmail,
  renderPoemTextForEmail,
} from './poemHtml';
import { getSiteUrl } from './config';
import { createUnsubscribeToken } from './unsubscribeToken';
import { createEmailToken } from './emailToken';

/**
 * Build a signed, one-click unsubscribe URL. Carries a tamper-proof token
 * rather than the raw email so the link can't be used to unsubscribe others.
 */
function buildUnsubscribeUrl(email: string): string {
  return `${getSiteUrl()}/api/unsubscribe?token=${createUnsubscribeToken(email)}`;
}

/**
 * Build a link to the new-poem notification settings.
 *
 * Points at a page rather than an API route, and names an absolute action
 * instead of a toggle: mail scanners follow links in delivered email, and a
 * toggling GET would flip the reader's setting without them ever clicking.
 */
function buildNotificationsUrl(email: string, action?: 'on' | 'off'): string {
  const token = createEmailToken(email, 'notifications');
  const query = action ? `?token=${token}&action=${action}` : `?token=${token}`;
  return `${getSiteUrl()}/notifications${query}`;
}

/**
 * Footer link for the new-poem notification setting.
 *
 * A poem notification offers the way out directly ("off"); every other email
 * links to the settings page with no action, where the reader can switch it
 * either way.
 */
function notificationsFooter(email: string, kind: 'poem-notification' | 'general') {
  return kind === 'poem-notification'
    ? { url: buildNotificationsUrl(email, 'off'), label: 'Turn off new-poem emails' }
    : { url: buildNotificationsUrl(email), label: 'Turn new-poem emails on or off' };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD environment variables must be set');
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const transport = getTransporter();
  const fromName = process.env.EMAIL_FROM_NAME || 'Blumenous Poetry';
  const fromEmail = process.env.GMAIL_USER;

  const info = await transport.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text,
  });

  return { id: info.messageId };
}

interface PoemEmailData {
  title: string;
  content: string;
  slug: string;
  unsubscribeEmail: string;
  customMessage?: string;
}

interface NewsletterEmailData {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  poem?: {
    title: string;
    content: string;
    slug: string;
  };
  unsubscribeEmail: string;
}

/** Padding the shell and the white card each take out of the text column. */
const SHELL_PADDING = 20;
const CARD_PADDING = 40;

/** Standard email width, for mail that is only prose. */
const SHELL_WIDTH = 600;

/**
 * Wide enough to lay out a poem at `POEM_EMAIL_MEASURE_PX` and no wider, so an
 * emailed poem breaks its lines exactly where the site does. A poem's line
 * breaks are the poet's, so the shell gives way to the poem, not the reverse.
 *
 * Counts only the card padding: email has no `box-sizing: border-box` reset, so
 * the shell's own padding sits outside this width.
 */
const POEM_SHELL_WIDTH = POEM_EMAIL_MEASURE_PX + 2 * CARD_PADDING;

/**
 * Shared doctype/head/font/card/footer wrapper for every outgoing email.
 * `headTitle` fills both the `<title>` tag and the `<h1>`; `bodyContent` is
 * the pre-rendered HTML that goes between the h1 and the footer.
 */
function renderEmailShell({
  headTitle,
  bodyContent,
  unsubscribeUrl,
  notifications,
  width = SHELL_WIDTH,
}: {
  headTitle: string;
  bodyContent: string;
  width?: number;
  unsubscribeUrl: string;
  notifications: { url: string; label: string };
}): string {
  const fontStack = POEM_FONT_STACK;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${headTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap');
  </style>
</head>
<body style="font-family: ${fontStack}; background-color: #f8f8f8; margin: 0; padding: 0;">
  <div style="max-width: ${width}px; margin: 0 auto; padding: 40px ${SHELL_PADDING}px;">
    <div style="background-color: #ffffff; padding: ${CARD_PADDING}px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
      <h1 style="color: #09090b; font-size: 24px; font-weight: normal; margin: 0 0 24px 0; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px;">
        ${headTitle}
      </h1>

      ${bodyContent}
    </div>

    <div style="text-align: center; margin-top: 24px; color: #52525b; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        Blumenous Poetry
      </p>
      <p style="margin: 0 0 8px 0;">
        <a href="${notifications.url}" style="color: #52525b; text-decoration: underline;">
          ${notifications.label}
        </a>
      </p>
      <p style="margin: 0;">
        <a href="${unsubscribeUrl}" style="color: #52525b; text-decoration: underline;">
          Unsubscribe from all emails
        </a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Shared heading/body/footer wrapper for the plain-text equivalents.
 * `heading` is the title/subject line; `body` is everything between it and
 * the final `---` / unsubscribe footer.
 */
function renderEmailTextShell(
  heading: string,
  body: string,
  unsubscribeUrl: string,
  notifications: { url: string; label: string }
): string {
  return `
${heading}

${body}
---

${notifications.label}: ${notifications.url}

Unsubscribe from all emails: ${unsubscribeUrl}
  `.trim();
}

export function generatePoemEmailHtml({ title, content, slug, unsubscribeEmail, customMessage }: PoemEmailData): string {
  const siteUrl = getSiteUrl();
  const poemUrl = `${siteUrl}/poem/${slug}`;
  const unsubscribeUrl = buildUnsubscribeUrl(unsubscribeEmail);

  // Escape HTML entities to prevent injection
  const safeTitle = escapeHtml(title);

  const formattedContent = renderPoemHtmlForEmail(content);

  const formattedMessage = customMessage
    ? customMessage
        .split('\n')
        .map((line) => (line.trim() === '' ? '<br>' : `<p style="margin: 0; line-height: 1.6;">${escapeHtml(line)}</p>`))
        .join('\n')
    : '';

  const bodyContent = `${formattedMessage ? `
      <div style="color: #09090b; font-size: 16px; line-height: 1.6; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e4e4e7;">
        ${formattedMessage}
      </div>
      ` : ''}

      ${formattedContent}

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
        <a href="${poemUrl}" style="color: #2563eb; text-decoration: none;">
          Read on Blumenous Poetry &rarr;
        </a>
      </div>`;

  return renderEmailShell({
    headTitle: safeTitle,
    bodyContent,
    width: POEM_SHELL_WIDTH,
    unsubscribeUrl,
    notifications: notificationsFooter(unsubscribeEmail, 'poem-notification'),
  });
}

export function generatePoemEmailText({ title, content, slug, unsubscribeEmail, customMessage }: PoemEmailData): string {
  const siteUrl = getSiteUrl();
  const poemUrl = `${siteUrl}/poem/${slug}`;
  const unsubscribeUrl = buildUnsubscribeUrl(unsubscribeEmail);

  const messageSection = customMessage ? `${customMessage}\n\n---\n\n` : '';

  const body = `${messageSection}${renderPoemTextForEmail(content)}

---

Read on Blumenous Poetry: ${poemUrl}
`;

  return renderEmailTextShell(
    title,
    body,
    unsubscribeUrl,
    notificationsFooter(unsubscribeEmail, 'poem-notification')
  );
}

export function generateNewsletterHtml({ subject, bodyHtml, poem, unsubscribeEmail }: NewsletterEmailData): string {
  const siteUrl = getSiteUrl();
  const unsubscribeUrl = buildUnsubscribeUrl(unsubscribeEmail);

  // Escape subject and sanitize body HTML to prevent injection
  const safeSubject = escapeHtml(subject);
  const safeBodyHtml = sanitizeNewsletterHtml(bodyHtml);

  const poemSection = poem ? `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
        <h2 style="color: #09090b; font-size: 20px; font-weight: normal; margin: 0 0 16px 0;">
          ${escapeHtml(poem.title)}
        </h2>
        ${renderPoemHtmlForEmail(poem.content)}
        <div style="margin-top: 24px;">
          <a href="${siteUrl}/poem/${poem.slug}" style="color: #2563eb; text-decoration: none;">
            Read on Blumenous Poetry &rarr;
          </a>
        </div>
      </div>
    ` : '';

  const bodyContent = `<div style="color: #09090b; font-size: 16px; line-height: 1.6;">
        ${safeBodyHtml}
      </div>

      ${poemSection}`;

  return renderEmailShell({
    headTitle: safeSubject,
    bodyContent,
    width: poem ? POEM_SHELL_WIDTH : SHELL_WIDTH,
    unsubscribeUrl,
    notifications: notificationsFooter(unsubscribeEmail, 'general'),
  });
}

export function generateNewsletterText({ subject, bodyText, poem, unsubscribeEmail }: NewsletterEmailData): string {
  const siteUrl = getSiteUrl();
  const unsubscribeUrl = buildUnsubscribeUrl(unsubscribeEmail);

  const poemSection = poem ? `
---

${poem.title}

${renderPoemTextForEmail(poem.content)}

Read on Blumenous Poetry: ${siteUrl}/poem/${poem.slug}
` : '';

  const body = `${bodyText}
${poemSection}`;

  return renderEmailTextShell(
    subject,
    body,
    unsubscribeUrl,
    notificationsFooter(unsubscribeEmail, 'general')
  );
}
