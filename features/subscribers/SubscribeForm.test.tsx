import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { SubscribeForm } from './SubscribeForm';
import { subscribe } from './api/subscribers';

jest.mock('./api/subscribers', () => ({ subscribe: jest.fn() }));

beforeEach(() => jest.resetAllMocks());

describe('SubscribeForm', () => {
  it('signs up for new-poem emails from the compact form', async () => {
    (subscribe as jest.Mock).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<SubscribeForm compact />);

    await user.type(screen.getByLabelText('Email address'), 'a@x.com');
    await user.click(screen.getByRole('button', { name: 'Go' }));

    expect(await screen.findAllByText('Thank you for subscribing!')).not.toHaveLength(0);
    expect(subscribe).toHaveBeenCalledWith({ email: 'a@x.com', notifyNewPoems: true });
  });

  it('toasts the server error and keeps the form', async () => {
    (subscribe as jest.Mock).mockRejectedValue(new Error('This email is already subscribed'));
    const user = userEvent.setup();
    renderWithProviders(<SubscribeForm />);

    await user.type(screen.getByLabelText('Email address'), 'a@x.com');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByText('This email is already subscribed')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
  });
});
