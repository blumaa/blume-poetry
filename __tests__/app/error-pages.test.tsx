import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalError from '@/app/error';
import PoemError from '@/app/(site)/poem/[slug]/error';

const error = new Error('boom');

describe.each([
  ['GlobalError', GlobalError],
  ['PoemError', PoemError],
])('%s', (_name, Boundary) => {
  it('retries through reset', async () => {
    const reset = jest.fn();
    render(<Boundary error={error} reset={reset} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});

it('PoemError links home', () => {
  render(<PoemError error={error} reset={() => {}} />);
  expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
});
