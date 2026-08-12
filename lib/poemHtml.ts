import sanitizeHtml from 'sanitize-html';
import {
  ALLOWED_ATTRIBUTES,
  ALLOWED_STYLES,
  POEM_SANITIZE_OPTIONS,
  sanitizePoemHtml,
} from './sanitize';
import { estimateLongestLineEm, fitFontSizePx } from './poemFit';

/**
 * Single source of truth for turning a stored poem into rendered output.
 *
 * `poems.content` is the canonical copy: Tiptap HTML. The site renders it with
 * `PoemContent` + the `.poem-content` rules in globals.css. Email clients drop
 * classes and often strip `<style>`, so `renderPoemHtmlForEmail` re-states those
 * same rules as inline styles. Keep the two in sync — the constants below are
 * the shared definition.
 */

/** Mirrors `--font-sans` in globals.css, spelled out for clients with no CSS vars. */
export const POEM_FONT_STACK =
  "'Source Sans 3', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Mirrors `.poem-content` / `.poem-content p` line spacing. */
const POEM_LINE_HEIGHT = '1.8';

/** Font size of the poem in email, matching the site's mobile step. */
const POEM_EMAIL_FONT_SIZE_PX = 16;

/**
 * Widest a poem column ever gets, mirroring `--poem-measure` in globals.css.
 *
 * Lineation is the poem's own content, so the column is measured in ems rather
 * than pixels: at the same measure, the site and an email break a line at the
 * same word regardless of which font size each is rendering at.
 */
const POEM_MEASURE_EM = 42;

/** `--poem-measure` resolved at the email font size, for the shell in `email.ts`. */
export const POEM_EMAIL_MEASURE_PX = POEM_MEASURE_EM * POEM_EMAIL_FONT_SIZE_PX;

/**
 * Inline equivalents of the `.poem-content` rules, one entry per tag the poem
 * sanitizer allows to carry visual meaning. Author styles are appended after
 * these so they still win, matching how inline styles beat a class on the site.
 */
const EMAIL_TAG_STYLES: Record<string, string> = {
  p: `margin:0;line-height:${POEM_LINE_HEIGHT};min-height:1.8em;white-space:pre-wrap;`,
  strong: 'font-weight:700;',
  b: 'font-weight:700;',
  em: 'font-style:italic;',
  i: 'font-style:italic;',
  u: 'text-decoration:underline;',
  a: 'color:#2563eb;',
};

const wrapperStyle = (fontSizePx: number) => [
  `font-family:${POEM_FONT_STACK}`,
  `font-size:${fontSizePx}px`,
  'color:#09090b',
  `line-height:${POEM_LINE_HEIGHT}`,
  'white-space:pre-wrap',
  // Shrink-to-fit, the email equivalent of `width: max-content` on the site: the
  // block takes the width of the poem's longest line and no more. The shell in
  // `email.ts` is sized to `POEM_EMAIL_MEASURE_PX`, so that is where wrapping
  // starts. Outlook's Word engine ignores inline-block and falls back to a full
  // -width block, which wraps at the same place.
  'display:inline-block',
  'max-width:100%',
].join(';');

/**
 * Size for an emailed poem: the same fit-to-column the site applies in CSS,
 * done here because no mail client supports container queries. The column is
 * the card's text width, which is fixed, so this resolves to a single number
 * per poem rather than to a formula.
 */
function emailFontSizePx(content: string): number {
  return fitFontSizePx({
    lineEm: estimateLongestLineEm(content),
    columnPx: POEM_EMAIL_MEASURE_PX,
    maxPx: POEM_EMAIL_FONT_SIZE_PX,
  });
}

/**
 * Convert plain text to Tiptap-compatible HTML.
 * Content that already looks like HTML is returned untouched.
 *
 * Tabs and runs of spaces become non-breaking spaces so indentation survives
 * a contenteditable round-trip.
 */
export function contentToHtml(content: string): string {
  if (!content) return '';

  if (content.trim().startsWith('<')) {
    return content;
  }

  return content
    .split('\n')
    .map((line) => {
      if (!line) return '<p><br></p>';

      let processed = line.replace(/\t/g, '    ');
      processed = processed.replace(/ {2,}/g, (match) => ' '.repeat(match.length));
      processed = processed.replace(/^( +)/, (match) => ' '.repeat(match.length));

      return `<p>${processed}</p>`;
    })
    .join('');
}

/**
 * Render a poem for an HTML email.
 *
 * Unlike `PoemContent`, non-breaking spaces are left alone: the site strips them
 * because `white-space: pre-wrap` already preserves indentation and nbsp breaks
 * mobile wrapping, but Outlook's Word engine ignores pre-wrap, so nbsp is the
 * only thing holding indentation there.
 */
export function renderPoemHtmlForEmail(content: string): string {
  if (!content || !content.trim()) return '';

  const styled = sanitizeHtml(contentToHtml(content), {
    ...POEM_SANITIZE_OPTIONS,
    // Site markup carries `style` on block tags only; the inline styles below
    // land on marks like <em> too, so every tag needs to keep the attribute.
    allowedAttributes: {
      ...ALLOWED_ATTRIBUTES,
      '*': [...ALLOWED_ATTRIBUTES['*'], 'style'],
    },
    // The layout properties the `.poem-content` rules rely on, which authored
    // content has no reason to set but the injected styles below do.
    allowedStyles: {
      '*': {
        ...ALLOWED_STYLES['*'],
        'margin': [/.*/],
        'min-height': [/.*/],
        'line-height': [/.*/],
        'white-space': [/.*/],
      },
    },
    transformTags: Object.fromEntries(
      Object.entries(EMAIL_TAG_STYLES).map(([tag, style]) => [
        tag,
        (tagName: string, attribs: Record<string, string>) => ({
          tagName,
          attribs: { ...attribs, style: `${style}${attribs.style ?? ''}` },
        }),
      ])
    ),
  });

  return `<div style="${wrapperStyle(emailFontSizePx(content))}">${styled}</div>`;
}

const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
};

/**
 * Render the same poem as plain text for the multipart alternative.
 * Legacy rows that stored plain text instead of HTML pass through unchanged.
 */
export function renderPoemTextForEmail(content: string): string {
  if (!content || !content.trim()) return '';

  if (!content.trim().startsWith('<')) {
    return content;
  }

  return sanitizePoemHtml(content)
    // A <br> alone in a paragraph is the blank line the closing tag already emits.
    .replace(/<p([^>]*)>\s*<br\s*\/?>\s*<\/p>/gi, '<p$1></p>')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#x27;|&#39;/g, (entity) => HTML_ENTITIES[entity])
    .replace(/ /g, ' ')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
}
