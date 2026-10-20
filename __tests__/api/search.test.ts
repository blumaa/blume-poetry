/**
 * @jest-environment node
 *
 * /api/poems/search searches one collection: main unless the URL names another.
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/poems/search/route';

const searchPoems = jest.fn();
jest.mock('@/lib/poems', () => ({
  searchPoems: (...args: unknown[]) => searchPoems(...args),
}));

jest.mock('@/lib/rateLimit', () => ({
  ...jest.requireActual('@/lib/rateLimit'),
  checkRateLimit: async () => null,
}));

const search = (params: string) =>
  GET(new NextRequest(`http://localhost/api/poems/search?${params}`));

beforeEach(() => {
  searchPoems.mockReset();
  searchPoems.mockResolvedValue([{ id: '1', slug: 'rain', title: 'Rain' }]);
});

describe('GET /api/poems/search', () => {
  it('searches main when no collection is named', async () => {
    const res = await search('q=rain');
    expect(res.status).toBe(200);
    expect(searchPoems).toHaveBeenCalledWith('main', 'rain');
  });

  it('searches the named collection', async () => {
    await search('q=rain&collection=kinky');
    expect(searchPoems).toHaveBeenCalledWith('kinky', 'rain');
  });

  it('rejects an unknown collection', async () => {
    const res = await search('q=rain&collection=secret');
    expect(res.status).toBe(400);
    expect(searchPoems).not.toHaveBeenCalled();
  });
});
