import {
  POEM_MIN_FONT_PX,
  estimateLongestLineEm,
  fitFontSizePx,
} from '@/lib/poemFit';

describe('estimateLongestLineEm', () => {
  it('measures the longest line, not the whole poem', () => {
    const short = estimateLongestLineEm('<p>one</p>');
    const long = estimateLongestLineEm('<p>one</p><p>a much longer line than the first</p>');

    expect(long).toBeGreaterThan(short);
    expect(estimateLongestLineEm('<p>a much longer line than the first</p>')).toBe(long);
  });

  it('counts wide glyphs as wider than narrow ones', () => {
    // The whole point of measuring in ems rather than characters: 'W' takes
    // roughly three times the advance of 'i'.
    expect(estimateLongestLineEm('<p>WWWWWWWWWW</p>')).toBeGreaterThan(
      estimateLongestLineEm('<p>iiiiiiiiii</p>') * 2
    );
  });

  it('measures the text, not the markup', () => {
    const plain = estimateLongestLineEm('<p>a slow line</p>');

    expect(estimateLongestLineEm('<p><em>a slow</em> line</p>')).toBe(plain);
    expect(estimateLongestLineEm('<p style="text-align:center">a slow line</p>')).toBe(plain);
  });

  it('counts indentation, which is part of the line the poet wrote', () => {
    expect(estimateLongestLineEm('<p>    indented</p>')).toBeGreaterThan(
      estimateLongestLineEm('<p>indented</p>')
    );
  });

  it('reads entities and non-breaking spaces as the characters they stand for', () => {
    expect(estimateLongestLineEm('<p>&nbsp;&nbsp;ash&amp;oak</p>')).toBe(
      estimateLongestLineEm('<p>  ash&oak</p>')
    );
  });

  it('splits on <br> as well as paragraphs', () => {
    expect(estimateLongestLineEm('<p>short<br>a far longer line here</p>')).toBe(
      estimateLongestLineEm('<p>a far longer line here</p>')
    );
  });

  it('measures legacy plain-text poems the same way', () => {
    expect(estimateLongestLineEm('short\na far longer line here')).toBe(
      estimateLongestLineEm('<p>a far longer line here</p>')
    );
  });

  it('returns 0 for nothing to measure', () => {
    expect(estimateLongestLineEm('')).toBe(0);
    expect(estimateLongestLineEm('   ')).toBe(0);
    expect(estimateLongestLineEm('<p><br></p>')).toBe(0);
  });
});

describe('fitFontSizePx', () => {
  const maxPx = 16;

  it('leaves a poem that already fits at full size', () => {
    expect(fitFontSizePx({ lineEm: 20, columnPx: 672, maxPx })).toBe(maxPx);
  });

  it('never scales a short poem up', () => {
    expect(fitFontSizePx({ lineEm: 1, columnPx: 672, maxPx })).toBe(maxPx);
  });

  it('shrinks a wide poem until its longest line fits the column', () => {
    // 672 / 48 = 14px, and 48em at 14px is exactly 672px.
    expect(fitFontSizePx({ lineEm: 48, columnPx: 672, maxPx })).toBe(14);
  });

  it('stops at the legibility floor rather than shrinking without limit', () => {
    // A prose poem needs a size no one could read; it holds at the floor and
    // wraps instead, which is the right reading for prose anyway.
    expect(fitFontSizePx({ lineEm: 700, columnPx: 672, maxPx })).toBe(POEM_MIN_FONT_PX);
  });

  it('rounds down rather than up, since a fraction too wide still wraps', () => {
    // 672 / 43 = 15.627..., which has to become 15.6 and not 15.7.
    expect(fitFontSizePx({ lineEm: 43, columnPx: 672, maxPx })).toBe(15.6);
  });

  it('treats an unmeasurable poem as one that fits', () => {
    expect(fitFontSizePx({ lineEm: 0, columnPx: 672, maxPx })).toBe(maxPx);
  });
});
