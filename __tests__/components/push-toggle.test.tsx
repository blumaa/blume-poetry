/**
 * Admin control for like-notification push. Behaviors:
 * - enabling asks permission, subscribes the browser, registers with the server
 * - disabling unsubscribes the browser and removes the server registration
 * - renders nothing where push is unsupported
 */
import { render, screen, waitFor } from '@testing-library/react';
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

const fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));

import { PushToggle } from '@/components/admin/PushToggle';

describe('PushToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'QUJDREVGRw';
    global.fetch = fetchMock as unknown as typeof fetch;
    mockPushSupport();
  });

  it('enables notifications: subscribes the browser and registers with the server', async () => {
    pushManager.getSubscription.mockResolvedValue(null);
    render(<PushToggle />);

    const button = await screen.findByRole('button', { name: /enable like notifications/i });
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
    render(<PushToggle />);

    const button = await screen.findByRole('button', { name: /disable like notifications/i });
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

  it('renders nothing where push is unsupported', () => {
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });

    const { container } = render(<PushToggle />);
    expect(container).toBeEmptyDOMElement();
  });
});
