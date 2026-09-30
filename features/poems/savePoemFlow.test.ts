import { savePoemFlow } from './savePoemFlow';
import { notifyPoem, revalidatePoems, savePoem } from './api/poems';

jest.mock('./api/poems', () => ({
  savePoem: jest.fn(),
  revalidatePoems: jest.fn(),
  notifyPoem: jest.fn(),
}));

const save = savePoem as jest.Mock;
const revalidate = revalidatePoems as jest.Mock;
const notify = notifyPoem as jest.Mock;

const poem = {
  title: 'Autumn',
  subtitle: null,
  slug: 'autumn',
  content: '<p>x</p>',
  plain_text: 'x',
  status: 'published' as const,
  published_at: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.resetAllMocks();
  save.mockResolvedValue('p1');
  revalidate.mockResolvedValue(undefined);
});

describe('savePoemFlow', () => {
  it('saves, refreshes the poem page, and reports a new poem', async () => {
    await expect(savePoemFlow({ id: null, poem, notify: false })).resolves.toEqual({
      title: '"Autumn" created',
      tone: 'success',
    });
    expect(save).toHaveBeenCalledWith(null, poem);
    expect(revalidate).toHaveBeenCalledWith(['/poem/autumn']);
    expect(notify).not.toHaveBeenCalled();
  });

  it('reports an edit', async () => {
    await expect(savePoemFlow({ id: 'p1', poem, notify: false })).resolves.toEqual({
      title: 'Changes saved',
      tone: 'success',
    });
  });

  it('throws when the save fails, before refreshing or emailing', async () => {
    save.mockRejectedValue(new Error('duplicate slug'));
    await expect(savePoemFlow({ id: null, poem, notify: true })).rejects.toThrow('duplicate slug');
    expect(revalidate).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('emails subscribers with the saved id and counts them', async () => {
    notify.mockResolvedValue({ sent: 1 });
    await expect(savePoemFlow({ id: null, poem, notify: true })).resolves.toEqual({
      title: '"Autumn" created. Emailed 1 subscriber',
      tone: 'success',
    });
    expect(notify).toHaveBeenCalledWith('p1');
  });

  it('says when subscribers were already emailed', async () => {
    notify.mockResolvedValue({ sent: 0, alreadyNotified: true });
    const result = await savePoemFlow({ id: 'p1', poem, notify: true });
    expect(result.title).toBe('Changes saved. Subscribers had already been emailed about this poem');
  });

  /* The poem is saved either way; each failed follow-up is named so the
     admin knows which half went wrong. */
  it('reports a failed email without failing the save', async () => {
    notify.mockRejectedValue(new Error('Resend down'));
    await expect(savePoemFlow({ id: 'p1', poem, notify: true })).resolves.toEqual({
      title: 'Saved, but the email failed: Resend down',
      tone: 'danger',
    });
  });

  it('reports a failed site refresh and still emails', async () => {
    revalidate.mockRejectedValue(new Error('Failed to revalidate'));
    notify.mockResolvedValue({ sent: 2 });
    await expect(savePoemFlow({ id: 'p1', poem, notify: true })).resolves.toEqual({
      title: 'Saved, but the site refresh failed: Failed to revalidate',
      tone: 'danger',
    });
    expect(notify).toHaveBeenCalled();
  });
});
