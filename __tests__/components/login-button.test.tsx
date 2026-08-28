import { render, screen } from '@testing-library/react';
import { LoginButton } from '@/components/LoginButton';

describe('LoginButton', () => {
  it('links to the admin login page', () => {
    render(<LoginButton />);

    const link = screen.getByRole('link', { name: /admin login/i });
    expect(link).toHaveAttribute('href', '/login');
  });
});
