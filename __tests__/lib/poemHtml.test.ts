import { contentToHtml, renderPoemHtmlForEmail, renderPoemTextForEmail } from '@/lib/poemHtml';

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

  it('wraps the poem in the shared serif typography', () => {
    const html = renderPoemHtmlForEmail('<p>line</p>');

    expect(html).toMatch(/^<div style="[^"]*Crimson Text/);
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
