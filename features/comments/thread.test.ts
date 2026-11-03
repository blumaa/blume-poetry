import { buildThread, liveCount } from './thread';
import type { Comment } from './api/comments';

const row = (id: string, parent_id: string | null = null, removed = false): Comment => ({
  id,
  parent_id,
  author_name: removed ? '' : `name-${id}`,
  content: removed ? '' : `words-${id}`,
  created_at: '2026-01-01T00:00:00Z',
  removed_at: removed ? '2026-01-02T00:00:00Z' : null,
});

describe('buildThread', () => {
  it('keeps top-level comments in the order they were written', () => {
    expect(buildThread([row('a'), row('b')]).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('nests each reply under what it answers', () => {
    const [root] = buildThread([row('a'), row('b', 'a'), row('c', 'b')]);

    expect(root.replies?.map((c) => c.id)).toEqual(['b']);
    expect(root.replies?.[0].replies?.map((c) => c.id)).toEqual(['c']);
  });

  it('carries who wrote a live comment, what, and when', () => {
    expect(buildThread([row('a')])[0]).toEqual({
      id: 'a',
      author: 'name-a',
      body: 'words-a',
      createdAt: '2026-01-01T00:00:00Z',
    });
  });

  it('leaves a tombstone where a removed comment still has replies', () => {
    const [root] = buildThread([row('a', null, true), row('b', 'a')]);

    expect(root).toMatchObject({ id: 'a', removed: true });
    expect(root.replies?.map((c) => c.id)).toEqual(['b']);
  });

  it('drops a removed comment that nothing live hangs from', () => {
    const thread = buildThread([row('a', null, true), row('b', 'a', true), row('c')]);

    expect(thread.map((c) => c.id)).toEqual(['c']);
  });

  it('drops a reply whose parent is not in the list', () => {
    expect(buildThread([row('b', 'missing')])).toEqual([]);
  });
});

describe('liveCount', () => {
  it('counts every comment not removed, replies included', () => {
    expect(liveCount([row('a', null, true), row('b', 'a'), row('c')])).toBe(2);
  });
});
