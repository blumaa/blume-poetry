import { render, screen } from '@testing-library/react';
import { ButtonLink } from '@/components/mds';

describe('ButtonLink', () => {
  it('renders an MDS button as a link to the href', () => {
    render(<ButtonLink href="/about" variant="secondary">About</ButtonLink>);

    const link = screen.getByRole('link', { name: 'About' });
    expect(link).toHaveAttribute('href', '/about');
  });
});
