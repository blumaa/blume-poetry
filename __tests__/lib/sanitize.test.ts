import { sanitizeNewsletterHtml, sanitizePoemHtml, escapeHtml } from '@/lib/sanitize';

describe('sanitizeNewsletterHtml', () => {
  it('preserves safe HTML tags', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeNewsletterHtml(html)).toBe(html);
  });

  it('strips script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeNewsletterHtml(html)).toBe('<p>Hello</p>');
  });

  it('strips event handler attributes', () => {
    const html = '<p onclick="alert(1)">Click me</p>';
    expect(sanitizeNewsletterHtml(html)).toBe('<p>Click me</p>');
  });

  it('strips onerror attributes from images', () => {
    const html = '<img src="x" onerror="alert(1)">';
    const result = sanitizeNewsletterHtml(html);
    expect(result).not.toContain('onerror');
  });

  it('preserves allowed formatting tags', () => {
    const html = '<em>italic</em> <u>underline</u> <s>strike</s>';
    expect(sanitizeNewsletterHtml(html)).toBe(html);
  });

  it('adds target and rel to links', () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = sanitizeNewsletterHtml(html);
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('handles empty string', () => {
    expect(sanitizeNewsletterHtml('')).toBe('');
  });
});

describe('sanitizePoemHtml', () => {
  it('preserves poem-safe tags', () => {
    const html = '<p>A poem <em>with emphasis</em></p><blockquote>Quoted</blockquote>';
    expect(sanitizePoemHtml(html)).toBe(html);
  });

  it('allows sup and sub tags', () => {
    const html = '<p>H<sub>2</sub>O and E=mc<sup>2</sup></p>';
    expect(sanitizePoemHtml(html)).toBe(html);
  });

  it('strips script tags', () => {
    const html = '<p>Poem</p><script>alert("xss")</script>';
    expect(sanitizePoemHtml(html)).toBe('<p>Poem</p>');
  });

  it('strips iframe tags', () => {
    const html = '<p>Poem</p><iframe src="evil.com"></iframe>';
    expect(sanitizePoemHtml(html)).toBe('<p>Poem</p>');
  });
});

describe('escapeHtml', () => {
  it('escapes HTML entities', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeHtml("it's")).toBe("it&#x27;s");
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('passes through safe text', () => {
    expect(escapeHtml('Hello world')).toBe('Hello world');
  });
});
