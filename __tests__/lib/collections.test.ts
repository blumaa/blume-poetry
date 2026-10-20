/** @jest-environment node */
import { collectionHome, isPoemCollection, poemHref, slugFromPath } from '@/lib/collections';

describe('poemHref', () => {
  it('puts main poems under /poem', () => {
    expect(poemHref('main', 'a-poem')).toBe('/poem/a-poem');
  });

  it('puts kinky poems under /kinky', () => {
    expect(poemHref('kinky', 'a-poem')).toBe('/kinky/a-poem');
  });
});

describe('collectionHome', () => {
  it('is / for main and /kinky for kinky', () => {
    expect(collectionHome('main')).toBe('/');
    expect(collectionHome('kinky')).toBe('/kinky');
  });
});

describe('slugFromPath', () => {
  it("reads the slug of a poem in the collection", () => {
    expect(slugFromPath('main', '/poem/a-poem')).toBe('a-poem');
    expect(slugFromPath('kinky', '/kinky/a-poem')).toBe('a-poem');
  });

  it("is undefined on the collection's home and on other pages", () => {
    expect(slugFromPath('kinky', '/kinky')).toBeUndefined();
    expect(slugFromPath('main', '/about')).toBeUndefined();
    expect(slugFromPath('main', '/kinky/a-poem')).toBeUndefined();
  });
});

describe('isPoemCollection', () => {
  it('accepts the collections the database knows, nothing else', () => {
    expect(isPoemCollection('main')).toBe(true);
    expect(isPoemCollection('kinky')).toBe(true);
    expect(isPoemCollection('secret')).toBe(false);
  });
});
