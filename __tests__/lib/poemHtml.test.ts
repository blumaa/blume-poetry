import {
  POEM_EMAIL_MEASURE_PX,
  contentToHtml,
  renderPoemHtmlForEmail,
  renderPoemTextForEmail,
  truncatePoemForEmail,
} from '@/lib/poemHtml';
import { POEM_MIN_FONT_PX, estimateLongestLineEm, fitFontSizePx } from '@/lib/poemFit';

const NBSP = ' ';

describe('contentToHtml', () => {
  it('passes HTML through untouched', () => {
    expect(contentToHtml('<p>already html</p>')).toBe('<p>already html</p>');
  });

  it('wraps plain text lines in paragraphs', () => {
    expect(contentToHtml('one\ntwo')).toBe('<p>one</p><p>two</p>');
  });

  it('keeps blank lines as empty paragraphs', () => {
    expect(contentToHtml('one\n\ntwo')).toBe('<p>one</p><p><br></p><p>two</p>');
  });

  it('preserves leading indentation as non-breaking spaces', () => {
    expect(contentToHtml('  indented')).toBe(`<p>${NBSP}${NBSP}indented</p>`);
  });
});

describe('renderPoemHtmlForEmail', () => {
  it('renders stored HTML rather than escaping it', () => {
    const html = renderPoemHtmlForEmail('<p>a <strong>bold</strong> line</p>');

    expect(html).toContain('<strong');
    expect(html).toContain('bold');
    expect(html).not.toContain('&lt;strong&gt;');
  });

  it('accepts legacy plain-text content and formats it the same way', () => {
    const html = renderPoemHtmlForEmail('one\ntwo');

    expect(html).toContain('one');
    expect(html).toContain('two');
    expect(html.match(/<p[^>]*>/g)).toHaveLength(2);
  });

  it('inlines the site typography on every paragraph, since email clients drop CSS classes', () => {
    const html = renderPoemHtmlForEmail('<p>line</p>');
    const openingTag = html.match(/<p[^>]*>/)![0];

    expect(openingTag).toContain('margin:0');
    expect(openingTag).toContain('line-height:1.8');
    expect(openingTag).toContain('white-space:pre-wrap');
  });

  it('wraps the poem in the same family the site reads in', () => {
    const html = renderPoemHtmlForEmail('<p>line</p>');

    expect(html).toMatch(/^<div style="[^"]*Source Sans 3/);
  });

  it('sets a poem that fits at the full email size', () => {
    const wrapper = renderPoemHtmlForEmail('<p>a short line</p>').match(/^<div style="([^"]*)"/)![1];

    expect(wrapper).toContain('font-size:16px');
  });

  it('fits a wide poem down to the column, by the same rule the site uses', () => {
    // The site solves this in CSS and email solves it in JavaScript, so the
    // answer has to come from one place: lib/poemFit.
    const poem = `<p>${'wide '.repeat(40)}</p>`;
    const wrapper = renderPoemHtmlForEmail(poem).match(/^<div style="([^"]*)"/)![1];

    const expected = fitFontSizePx({
      lineEm: estimateLongestLineEm(poem),
      columnPx: POEM_EMAIL_MEASURE_PX,
      maxPx: 16,
    });

    expect(expected).toBeLessThan(16);
    expect(wrapper).toContain(`font-size:${expected}px`);
  });

  it('never sets a poem below the legibility floor, even a prose one', () => {
    const prose = `<p>${'a very long prose poem line that just keeps going '.repeat(40)}</p>`;
    const wrapper = renderPoemHtmlForEmail(prose).match(/^<div style="([^"]*)"/)![1];

    expect(wrapper).toContain(`font-size:${POEM_MIN_FONT_PX}px`);
  });

  it('shrinks the poem block to its longest line, like the site column does', () => {
    const wrapper = renderPoemHtmlForEmail('<p>line</p>').match(/^<div style="([^"]*)"/)![1];

    expect(wrapper).toContain('display:inline-block');
    expect(wrapper).toContain('max-width:100%');
  });


  it('keeps non-breaking spaces so indentation survives clients without pre-wrap', () => {
    const html = renderPoemHtmlForEmail(`<p>${NBSP}${NBSP}indented</p>`);

    expect(html).toContain(`${NBSP}${NBSP}indented`);
  });

  it('strips dangerous markup', () => {
    const html = renderPoemHtmlForEmail('<p>safe</p><script>alert(1)</script>');

    expect(html).toContain('safe');
    expect(html).not.toContain('<script');
  });

  it('preserves formatting marks the editor can produce', () => {
    const html = renderPoemHtmlForEmail('<p><em>i</em><u>u</u></p>');

    expect(html).toMatch(/<em style="[^"]*font-style:italic/);
    expect(html).toMatch(/<u style="[^"]*text-decoration:underline/);
  });

  it('returns an empty string for empty content', () => {
    expect(renderPoemHtmlForEmail('')).toBe('');
    expect(renderPoemHtmlForEmail('   ')).toBe('');
  });
});

describe('renderPoemTextForEmail', () => {
  it('converts stored HTML back to line-broken plain text', () => {
    expect(renderPoemTextForEmail('<p>one</p><p>two</p>')).toBe('one\ntwo');
  });

  it('turns empty paragraphs into blank lines', () => {
    expect(renderPoemTextForEmail('<p>one</p><p><br></p><p>two</p>')).toBe('one\n\ntwo');
  });

  it('drops formatting tags but keeps their text', () => {
    expect(renderPoemTextForEmail('<p>a <strong>bold</strong> line</p>')).toBe('a bold line');
  });

  it('decodes entities and normalizes non-breaking spaces to real spaces', () => {
    expect(renderPoemTextForEmail('<p>&nbsp;&nbsp;a &amp; b</p>')).toBe('  a & b');
  });

  it('passes legacy plain text through unchanged', () => {
    expect(renderPoemTextForEmail('one\ntwo')).toBe('one\ntwo');
  });
});

describe('truncatePoemForEmail', () => {
  it('keeps the first half of the poem and reports the cut', () => {
    const { content, truncated } = truncatePoemForEmail('<p>one</p><p>two</p><p>three</p><p>four</p>');

    expect(content).toBe('<p>one</p><p>two</p>');
    expect(truncated).toBe(true);
  });

  it('rounds an odd count up, so the reader gets the larger half', () => {
    const { content } = truncatePoemForEmail('<p>one</p><p>two</p><p>three</p>');

    expect(content).toBe('<p>one</p><p>two</p>');
  });

  it('counts a blank line as a line and never ends the excerpt on one', () => {
    const { content } = truncatePoemForEmail('<p>one</p><p><br></p><p>two</p><p>three</p>');

    expect(content).toBe('<p>one</p>');
  });

  it('counts soft breaks inside a paragraph as lines', () => {
    const { content } = truncatePoemForEmail('<p>one<br>two<br>three<br>four</p>');

    expect(content).toBe('<p>one<br>two<br>');
  });

  it('splits legacy plain-text content the same way', () => {
    const { content, truncated } = truncatePoemForEmail('one\ntwo\nthree\nfour');

    expect(content).toBe('<p>one</p><p>two</p>');
    expect(truncated).toBe(true);
  });

  it('leaves a one-line poem whole', () => {
    const { content, truncated } = truncatePoemForEmail('<p>only</p>');

    expect(content).toBe('<p>only</p>');
    expect(truncated).toBe(false);
  });

  it('leaves empty content alone', () => {
    expect(truncatePoemForEmail('')).toEqual({ content: '', truncated: false });
  });

  it('renders as valid markup once truncated mid-paragraph', () => {
    const { content } = truncatePoemForEmail('<p>one<br>two<br>three<br>four</p>');

    expect(renderPoemHtmlForEmail(content)).toContain('</p>');
  });
});

describe('renderPoemHtmlForEmail fitTo', () => {
  const longLine = 'a line long enough that it has to shrink to hold its lineation in one column';

  function fontSize(html: string): number {
    return Number(html.match(/font-size:(\d+(?:\.\d+)?)px/)![1]);
  }

  it('sizes an excerpt to the whole poem, so shown lines break where the site breaks them', () => {
    const whole = `<p>short</p><p>${longLine}</p>`;
    const excerpt = '<p>short</p>';

    expect(fontSize(renderPoemHtmlForEmail(excerpt, { fitTo: whole }))).toBe(
      fontSize(renderPoemHtmlForEmail(whole))
    );
  });
});
