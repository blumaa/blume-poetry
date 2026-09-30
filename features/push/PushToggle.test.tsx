/**
 * Admin control for like-notification push. Behaviors:
 * - enabling asks permission, subscribes the browser, registers with the server
 * - disabling unsubscribes the browser and removes the server registration
 * - renders nothing where push is unsupported
 */
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';

const subscription = {
  endpoint: 'https://push.test/sub-1',
  toJSON: () => ({
    endpoint: 'https://push.test/sub-1',
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  }),
  unsubscribe: jest.fn(async () => true),
};

const pushManager = {
  getSubscription: jest.fn(async (): Promise<typeof subscription | null> => null),
  subscribe: jest.fn(async () => subscription),
};

const registration = { pushManager };

function mockPushSupport() {
  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: { register: jest.fn(async () => registration) },
  });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function () {} });
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: { requestPermission: jest.fn(async () => 'granted'), permission: 'default' },
  });
}

const fetchMock = jest.fn(async (): Promise<Pick<Response, 'ok' | 'json'>> => ({
  ok: true,
  json: async () => ({ ok: true }),
}));

import { PushToggle } from './PushToggle';

describe('PushToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'QUJDREVGRw';
    global.fetch = fetchMock as unknown as typeof fetch;
    mockPushSupport();
  });

  it('enables notifications: subscribes the browser and registers with the server', async () => {
    pushManager.getSubscription.mockResolvedValue(null);
    renderWithProviders(<PushToggle />);

    const button = await screen.findByRole('button', { name: /enable like notifications/i });
    pushManager.getSubscription.mockResolvedValue(subscription);
    await userEvent.click(button);

    await waitFor(() => {
      expect(pushManager.subscribe).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/push',
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(
      await screen.findByRole('button', { name: /disable like notifications/i })
    ).toBeInTheDocument();
  });

  it('disables notifications: unsubscribes and removes the server registration', async () => {
    pushManager.getSubscription.mockResolvedValue(subscription);
    renderWithProviders(<PushToggle />);

    const button = await screen.findByRole('button', { name: /disable like notifications/i });
    subscription.unsubscribe.mockImplementation(async () => {
      pushManager.getSubscription.mockResolvedValue(null);
      return true;
    });
    await userEvent.click(button);

    await waitFor(() => {
      expect(subscription.unsubscribe).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/push',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    expect(
      await screen.findByRole('button', { name: /enable like notifications/i })
    ).toBeInTheDocument();
  });

  it('keeps every mounted toggle on the same subscription state', async () => {
    pushManager.getSubscription.mockResolvedValue(null);
    renderWithProviders(
      <>
        <PushToggle />
        <PushToggle />
      </>
    );

    const [first] = await screen.findAllByRole('button', { name: /enable like notifications/i });
    pushManager.getSubscription.mockResolvedValue(subscription);
    await userEvent.click(first);

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /disable like notifications/i })).toHaveLength(2)
    );
  });

  it('stays off when permission is refused', async () => {
    pushManager.getSubscription.mockResolvedValue(null);
    (window.Notification.requestPermission as jest.Mock).mockResolvedValue('denied');
    renderWithProviders(<PushToggle />);

    await userEvent.click(
      await screen.findByRole('button', { name: /enable like notifications/i })
    );

    expect(
      await screen.findByRole('button', { name: /enable like notifications/i })
    ).toBeEnabled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('reports a failed server registration and stays off', async () => {
    pushManager.getSubscription.mockResolvedValue(null);
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<PushToggle />);

    await userEvent.click(
      await screen.findByRole('button', { name: /enable like notifications/i })
    );

    expect(await screen.findByText("Couldn't enable like notifications")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable like notifications' })).toBeEnabled();
  });

  it('renders nothing where push is unsupported', () => {
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });

    renderWithProviders(<PushToggle />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
