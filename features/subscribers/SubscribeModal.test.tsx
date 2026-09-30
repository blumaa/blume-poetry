import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { SubscribeModal } from './SubscribeModal';
import { addSubscriber, subscribe } from './api/subscribers';

jest.mock('./api/subscribers', () => ({ subscribe: jest.fn(), addSubscriber: jest.fn() }));

beforeEach(() => jest.resetAllMocks());

describe('SubscribeModal', () => {
  it('signs a visitor up with their preference', async () => {
    (subscribe as jest.Mock).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<SubscribeModal isOpen onClose={() => {}} />);

    await user.type(screen.getByLabelText('Email address'), 'a@x.com');
    await user.click(screen.getByLabelText('Email me when a new poem is published'));
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByText('Thank you for subscribing!')).toBeInTheDocument();
    expect(subscribe).toHaveBeenCalledWith({ email: 'a@x.com', notifyNewPoems: false });
  });

  it('shows the server error', async () => {
    (subscribe as jest.Mock).mockRejectedValue(new Error('This email is already subscribed'));
    const user = userEvent.setup();
    renderWithProviders(<SubscribeModal isOpen onClose={() => {}} />);

    await user.type(screen.getByLabelText('Email address'), 'a@x.com');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This email is already subscribed');
  });

  it('lets the admin add someone and reports success', async () => {
    (addSubscriber as jest.Mock).mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    renderWithProviders(<SubscribeModal isOpen isAdmin onClose={() => {}} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Email address'), 'a@x.com');
    await user.click(screen.getByRole('button', { name: 'Add Subscriber' }));

    expect(await screen.findByText('Subscriber added!')).toBeInTheDocument();
    expect(addSubscriber).toHaveBeenCalledWith('a@x.com');
    expect(onSuccess).toHaveBeenCalled();
  });
});
