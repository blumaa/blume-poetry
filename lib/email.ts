import nodemailer from 'nodemailer';
import { escapeHtml, sanitizeNewsletterHtml } from './sanitize';

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

export function generatePoemEmailHtml({ title, content, slug, unsubscribeEmail, customMessage }: PoemEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blumenous-poetry.vercel.app';
  const poemUrl = `${siteUrl}/poem/${slug}`;
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(unsubscribeEmail)}`;

  // Escape HTML entities to prevent injection
  const safeTitle = escapeHtml(title);

  const formattedContent = content
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br>' : `<p style="margin: 0; line-height: 1.8;">${escapeHtml(line)}</p>`))
    .join('\n');

  const formattedMessage = customMessage
    ? customMessage
        .split('\n')
        .map((line) => (line.trim() === '' ? '<br>' : `<p style="margin: 0; line-height: 1.6;">${escapeHtml(line)}</p>`))
        .join('\n')
    : '';

  const fontStack = "'Crimson Text', Georgia, 'Times New Roman', serif";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap');
  </style>
</head>
<body style="font-family: ${fontStack}; background-color: #f8f8f8; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
      <h1 style="color: #09090b; font-size: 24px; font-weight: normal; margin: 0 0 24px 0; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px;">
        ${safeTitle}
      </h1>

      ${formattedMessage ? `
      <div style="color: #09090b; font-size: 16px; line-height: 1.6; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e4e4e7;">
        ${formattedMessage}
      </div>
      ` : ''}

      <div style="color: #09090b; font-size: 16px; line-height: 1.8;">
        ${formattedContent}
      </div>

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
        <a href="${poemUrl}" style="color: #2563eb; text-decoration: none;">
          Read on Blumenous Poetry &rarr;
        </a>
      </div>
    </div>

    <div style="text-align: center; margin-top: 24px; color: #52525b; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        Blumenous Poetry
      </p>
      <p style="margin: 0;">
        <a href="${unsubscribeUrl}" style="color: #52525b; text-decoration: underline;">
          Unsubscribe
        </a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generatePoemEmailText({ title, content, slug, unsubscribeEmail, customMessage }: PoemEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blumenous-poetry.vercel.app';
  const poemUrl = `${siteUrl}/poem/${slug}`;
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(unsubscribeEmail)}`;

  const messageSection = customMessage ? `${customMessage}\n\n---\n\n` : '';

  return `
${title}

${messageSection}${content}

---

Read on Blumenous Poetry: ${poemUrl}

---

Unsubscribe: ${unsubscribeUrl}
  `.trim();
}

export function generateNewsletterHtml({ subject, bodyHtml, poem, unsubscribeEmail }: NewsletterEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blumenous-poetry.vercel.app';
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(unsubscribeEmail)}`;

  // Escape subject and sanitize body HTML to prevent injection
  const safeSubject = escapeHtml(subject);
  const safeBodyHtml = sanitizeNewsletterHtml(bodyHtml);

  const poemSection = poem ? `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
        <h2 style="color: #09090b; font-size: 20px; font-weight: normal; margin: 0 0 16px 0;">
          ${escapeHtml(poem.title)}
        </h2>
        <div style="color: #09090b; font-size: 16px; line-height: 1.8;">
          ${poem.content
            .split('\n')
            .map((line) => (line.trim() === '' ? '<br>' : `<p style="margin: 0; line-height: 1.8;">${escapeHtml(line)}</p>`))
            .join('\n')}
        </div>
        <div style="margin-top: 24px;">
          <a href="${siteUrl}/poem/${poem.slug}" style="color: #2563eb; text-decoration: none;">
            Read on Blumenous Poetry &rarr;
          </a>
        </div>
      </div>
    ` : '';

  const fontStack = "'Crimson Text', Georgia, 'Times New Roman', serif";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeSubject}</title>
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap');
  </style>
</head>
<body style="font-family: ${fontStack}; background-color: #f8f8f8; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
      <h1 style="color: #09090b; font-size: 24px; font-weight: normal; margin: 0 0 24px 0; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px;">
        ${safeSubject}
      </h1>

      <div style="color: #09090b; font-size: 16px; line-height: 1.6;">
        ${safeBodyHtml}
      </div>

      ${poemSection}
    </div>

    <div style="text-align: center; margin-top: 24px; color: #52525b; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        Blumenous Poetry
      </p>
      <p style="margin: 0;">
        <a href="${unsubscribeUrl}" style="color: #52525b; text-decoration: underline;">
          Unsubscribe
        </a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateNewsletterText({ subject, bodyText, poem, unsubscribeEmail }: NewsletterEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blumenous-poetry.vercel.app';
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(unsubscribeEmail)}`;

  const poemSection = poem ? `
---

${poem.title}

${poem.content}

Read on Blumenous Poetry: ${siteUrl}/poem/${poem.slug}
` : '';

  return `
${subject}

${bodyText}
${poemSection}
---

Unsubscribe: ${unsubscribeUrl}
  `.trim();
}
