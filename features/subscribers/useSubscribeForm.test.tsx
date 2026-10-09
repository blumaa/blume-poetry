import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/__tests__/test-utils';
import { useSubscribeForm } from './useSubscribeForm';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

const submitEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

describe('useSubscribeForm', () => {
  it('submits the current email and preference, then clears the email', async () => {
    const submit = jest.fn().mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useSubscribeForm({ submit, onSuccess }), { wrapper });

    act(() => {
      result.current.setEmail('reader@example.com');
      result.current.setNotifyNewPoems(false);
    });
    act(() => result.current.handleSubmit(submitEvent));

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
    expect(submit).toHaveBeenCalledWith({ email: 'reader@example.com', notifyNewPoems: false });
    expect(submitEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.email).toBe('');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('defaults to new-poem emails on', () => {
    const { result } = renderHook(() => useSubscribeForm({ submit: jest.fn() }), { wrapper });
    expect(result.current.notifyNewPoems).toBe(true);
  });

  it('reset clears the email and the mutation state', async () => {
    const submit = jest.fn().mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useSubscribeForm({ submit }), { wrapper });

    act(() => result.current.setEmail('reader@example.com'));
    act(() => result.current.handleSubmit(submitEvent));
    await waitFor(() => expect(result.current.mutation.isError).toBe(true));

    act(() => result.current.reset());
    await waitFor(() => expect(result.current.mutation.isIdle).toBe(true));
    expect(result.current.email).toBe('');
  });
});
