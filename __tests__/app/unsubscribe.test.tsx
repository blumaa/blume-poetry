/**
 * @jest-environment node
 *
 * The unsubscribe page asks before it acts (a GET must not unsubscribe, since
 * mail scanners follow links), and its button unsubscribes only the token's
 * address.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import UnsubscribePage from '@/app/(site)/unsubscribe/page';
import { unsubscribe } from '@/app/(site)/unsubscribe/actions';
import { createUnsubscribeToken } from '@/lib/unsubscribeToken';
import { clientMock, queryMock } from '@/__tests__/supabaseMock';
import { IconRegistry } from '@/components/icons';

let adminClient: ReturnType<typeof clientMock>;

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminClient,
}));

jest.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

async function render(searchParams: Record<string, string>) {
  const page = await UnsubscribePage({ searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(<IconRegistry>{page}</IconRegistry>);
}

function form(token: string) {
  const data = new FormData();
  data.set('token', token);
  return data;
}

beforeEach(() => {
  process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  adminClient = clientMock({ subscribers: [queryMock()] });
});

describe('UnsubscribePage', () => {
  it('asks the token holder to confirm', async () => {
    const html = await render({ token: createUnsubscribeToken('reader@example.com') });

    expect(html).toContain('Unsubscribe from all emails?');
    expect(html).toContain('reader@example.com');
    expect(adminClient.from).not.toHaveBeenCalled();
  });

  it('calls a forged link broken', async () => {
    expect(await render({ token: 'attacker.forged' })).toContain('This link is missing something');
  });

  it('confirms once done', async () => {
    expect(await render({ done: '1' })).toContain('been unsubscribed');
  });
});

describe('unsubscribe action', () => {
  it('unsubscribes the token holder and lands on done', async () => {
    const query = queryMock();
    adminClient = clientMock({ subscribers: [query] });

    await expect(unsubscribe(form(createUnsubscribeToken('reader@example.com')))).rejects.toThrow(
      'NEXT_REDIRECT:/unsubscribe?done=1'
    );
    expect(query.argsOf('eq')).toEqual([['email', 'reader@example.com']]);
  });

  it('touches nothing for a forged token', async () => {
    await expect(unsubscribe(form('attacker.forged'))).rejects.toThrow('NEXT_REDIRECT:/unsubscribe');
    expect(adminClient.from).not.toHaveBeenCalled();
  });
});
