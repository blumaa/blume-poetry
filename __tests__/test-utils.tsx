import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/mds';
import { IconRegistry } from '@/components/icons';

/* Fresh QueryClient per render: no cache leakage between tests, no retries
   so failure paths resolve immediately. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <IconRegistry>
      <ToastProvider regionLabel="Notifications" dismissLabel="Dismiss:">
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ToastProvider>
    </IconRegistry>
  );
  return { ...render(ui, { wrapper }), queryClient };
}
