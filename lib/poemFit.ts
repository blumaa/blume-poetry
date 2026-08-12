/**
 * Fitting a poem's longest line to the column it is read in.
 *
 * A poem's line breaks are the poet's, so when a line is wider than the space
 * available the poem gives up size before it gives up lineation. This module is
 * the single definition of that policy: the site applies it in CSS (`clamp()`
 * over `--poem-line` in globals.css) and the email renderer applies it in
 * JavaScript, both from the numbers below.
 */

/**
 * Smallest a poem is ever set. Below this, shrinking buys lineation at a price
 * nobody wants to pay in reading; a poem needing less holds here and wraps.
 * Mirrored by `--poem-fit-min` in globals.css.
 */
export const POEM_MIN_FONT_PX = 13;

/**
 * Approximate advance widths for Source Sans 3, in em, by character class.
 *
 * Real metrics would mean parsing the font file at build time; these are within
 * a few percent across ordinary English text, and `SAFETY` below covers the
 * error in the direction that matters (guessing too narrow would let a line
 * wrap after we promised it wouldn't).
 */
function advanceEm(char: string): number {
  if (char === ' ') return 0.26;
  if ("iljt.,;:'!|I()[]".includes(char)) return 0.29;
  if ('fr-'.includes(char)) return 0.34;
  if ('mwMW@'.includes(char)) return 0.8;
  if (char >= 'A' && char <= 'Z') return 0.62;
  return 0.5;
}

/** Margin on the estimate, since `advanceEm` approximates the real font. */
const SAFETY = 1.02;

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
};

/**
 * Split rendered poem markup back into the lines the poet wrote. Legacy rows
 * that stored plain text are already lines.
 */
function toLines(content: string): string[] {
  return content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#x27;|&#39;/g, (entity) => ENTITIES[entity])
    .replace(/ /g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''));
}

/**
 * Width of the poem's longest line, in em, so it can be compared against a
 * column of any font size. Rounded to two places: this is an estimate, and a
 * short number keeps the value readable in the markup that carries it.
 */
export function estimateLongestLineEm(content: string): number {
  if (!content || !content.trim()) return 0;

  const widest = toLines(content).reduce((widestSoFar, line) => {
    const width = [...line].reduce((sum, char) => sum + advanceEm(char), 0);
    return width > widestSoFar ? width : widestSoFar;
  }, 0);

  return Math.round(widest * SAFETY * 100) / 100;
}

/**
 * Largest font size, up to `maxPx`, at which a line of `lineEm` still fits a
 * column of `columnPx` — floored at `POEM_MIN_FONT_PX`. A poem too wide to fit
 * even there keeps the floor and wraps.
 *
 * `lineEm` of 0 means nothing measurable, which is not a reason to shrink.
 */
export function fitFontSizePx({
  lineEm,
  columnPx,
  maxPx,
}: {
  lineEm: number;
  columnPx: number;
  maxPx: number;
}): number {
  if (lineEm <= 0) return maxPx;

  // Rounded down, never up: a tenth of a pixel too large is a wrapped line.
  const fitted = Math.floor((columnPx / lineEm) * 10) / 10;

  return Math.max(POEM_MIN_FONT_PX, Math.min(maxPx, fitted));
}
