import { render } from '@testing-library/react';
import { PoemContent } from '@/components/PoemContent';
import { estimateLongestLineEm } from '@/lib/poemFit';

const NBSP = ' ';

function renderPoem(html: string) {
  const { container } = render(<PoemContent html={html} />);
  return container.querySelector('.poem-content') as HTMLElement;
}

function renderFit(html: string) {
  const { container } = render(<PoemContent html={html} />);
  return container.querySelector('.poem-fit') as HTMLElement;
}

describe('PoemContent', () => {
  it('renders the poem under the shared .poem-content class', () => {
    expect(renderPoem('<p>a line</p>')).not.toBeNull();
  });

  it('renders nothing for empty content', () => {
    const { container } = render(<PoemContent html="   " />);
    expect(container.firstChild).toBeNull();
  });

  it('leaves layout to the stylesheet so the poem column can size itself', () => {
    // `.poem-content` sizes the column to the poem's longest line (width:
    // max-content, capped by the container). An inline width, max-width or
    // line-height here would beat that rule and pin the poem to a fixed measure.
    const style = renderPoem('<p>a line</p>').getAttribute('style') ?? '';

    expect(style).not.toMatch(/(^|;)\s*(width|max-width|line-height)\s*:/);
  });

  it('does not carry type utilities that would fight the stylesheet', () => {
    // A `text-lg` utility ships its own line-height, so it would silently
    // replace the 1.8 the email renderer mirrors.
    const className = renderPoem('<p>a line</p>').className;

    expect(className).not.toMatch(/\bleading-/);
    expect(className).not.toMatch(/\b(md:)?text-(xs|sm|base|lg|xl|\dxl)\b/);
  });

  it('hands the poem measurement to CSS as a query container', () => {
    // `.poem-fit` is the container the poem is fitted against; `--poem-line`
    // is the only number CSS needs to size the poem to it.
    const poem = '<p>a line the poet meant to stay one line</p>';
    const fit = renderFit(poem);

    expect(fit).not.toBeNull();
    expect(fit.contains(renderPoem(poem))).toBe(false); // separate renders
    expect(fit.querySelector('.poem-content')).not.toBeNull();
    expect(fit.style.getPropertyValue('--poem-line')).toBe(String(estimateLongestLineEm(poem)));
  });

  it('measures the poem it actually shows, entities and all', () => {
    const fit = renderFit(`<p>${NBSP}${NBSP}indented</p>`);

    expect(fit.style.getPropertyValue('--poem-line')).toBe(
      String(estimateLongestLineEm('  indented'))
    );
  });

  it('sanitizes the poem HTML', () => {
    const el = renderPoem('<p>safe</p><script>alert(1)</script>');

    expect(el.innerHTML).toContain('safe');
    expect(el.innerHTML).not.toContain('<script');
  });

  it('normalizes non-breaking spaces so indented lines can still wrap', () => {
    const el = renderPoem(`<p>${NBSP}${NBSP}indented</p>`);

    expect(el.innerHTML).not.toContain(NBSP);
    expect(el.textContent).toBe('  indented');
  });
});
