import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-utils';
import { NotificationSettings } from './NotificationSettings';
import { readPreference, writePreference } from './api/preferences';

jest.mock('./api/preferences', () => ({ readPreference: jest.fn(), writePreference: jest.fn() }));

beforeEach(() => jest.resetAllMocks());

describe('NotificationSettings', () => {
  it('reads the preference when the link names no action', async () => {
    (readPreference as jest.Mock).mockResolvedValue({ enabled: true, unsubscribed: false });
    renderWithProviders(<NotificationSettings token="t" />);

    expect(await screen.findByText('You’ll get an email when a new poem is published')).toBeInTheDocument();
    expect(writePreference).not.toHaveBeenCalled();
  });

  it("applies the link's action once, without a separate read", async () => {
    (writePreference as jest.Mock).mockResolvedValue({ enabled: false, unsubscribed: false });
    renderWithProviders(<NotificationSettings token="t" initialAction="off" />);

    expect(await screen.findByText('You won’t get emails about new poems')).toBeInTheDocument();
    expect(writePreference).toHaveBeenCalledTimes(1);
    expect(writePreference).toHaveBeenCalledWith('t', 'off');
    expect(readPreference).not.toHaveBeenCalled();
  });

  it('toggles to the opposite absolute value and shows what the server stored', async () => {
    (readPreference as jest.Mock).mockResolvedValue({ enabled: true, unsubscribed: false });
    (writePreference as jest.Mock).mockResolvedValue({ enabled: false, unsubscribed: false });
    const user = userEvent.setup();
    renderWithProviders(<NotificationSettings token="t" />);

    await user.click(await screen.findByRole('button', { name: 'Turn off new-poem emails' }));

    expect(await screen.findByRole('button', { name: 'Turn on new-poem emails' })).toBeInTheDocument();
    expect(writePreference).toHaveBeenCalledWith('t', 'off');
  });

  it('notes a full unsubscribe', async () => {
    (readPreference as jest.Mock).mockResolvedValue({ enabled: true, unsubscribed: true });
    renderWithProviders(<NotificationSettings token="t" />);

    expect(await screen.findByText(/unsubscribed from all emails/)).toBeInTheDocument();
  });

  it("shows the server's message when the link is bad", async () => {
    (readPreference as jest.Mock).mockRejectedValue(new Error('This link is no longer valid'));
    renderWithProviders(<NotificationSettings token="t" />);

    expect(await screen.findByText('This link has expired')).toBeInTheDocument();
    expect(screen.getByText('This link is no longer valid')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to poems' })).toHaveAttribute('href', '/');
  });
});
