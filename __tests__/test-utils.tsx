import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/mds';

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
    <ThemeProvider>
      <ToastProvider regionLabel="Notifications" dismissLabel="Dismiss:">
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ToastProvider>
    </ThemeProvider>
  );
  return { ...render(ui, { wrapper }), queryClient };
}
