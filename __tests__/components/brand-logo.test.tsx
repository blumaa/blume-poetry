import { render, screen } from '@testing-library/react';
import { BrandLogo } from '@/components/BrandLogo';

describe('BrandLogo', () => {
  it('renders the wordmark (the mark is parked in a comment for now)', () => {
    const { container } = render(<BrandLogo />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.getByText('blumenous')).toBeInTheDocument();
    expect(screen.getByText('poetry')).toBeInTheDocument();
  });

  it('is decorative: the link around it carries the accessible name', () => {
    const { container } = render(<BrandLogo />);
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('keeps mask ids unique across instances', () => {
    const { container } = render(
      <>
        <BrandLogo />
        <BrandLogo />
      </>
    );
    const ids = [...container.querySelectorAll('mask')].map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
