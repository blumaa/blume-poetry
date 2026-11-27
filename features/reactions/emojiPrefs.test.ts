import { recentEmoji, rememberEmoji, storedTone, storeTone, quickRow } from './emojiPrefs';

beforeEach(() => localStorage.clear());

describe('recentEmoji', () => {
  it('starts empty', () => {
    expect(recentEmoji()).toEqual([]);
  });

  it('puts the latest first and never twice', () => {
    rememberEmoji('🔥');
    rememberEmoji('❤️');
    rememberEmoji('🔥');
    expect(recentEmoji()).toEqual(['🔥', '❤️']);
  });

  it('keeps eight', () => {
    for (const char of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) rememberEmoji(char);
    expect(recentEmoji()).toEqual(['9', '8', '7', '6', '5', '4', '3', '2']);
  });

  it('reads anything that is not a list of strings as nothing', () => {
    localStorage.setItem('recent_emoji', '{"x":1}');
    expect(recentEmoji()).toEqual([]);
    localStorage.setItem('recent_emoji', 'not json');
    expect(recentEmoji()).toEqual([]);
  });
});

describe('storedTone', () => {
  it('is no tone until one is chosen', () => {
    expect(storedTone()).toBe(0);
  });

  it('remembers the chosen tone', () => {
    storeTone(4);
    expect(storedTone()).toBe(4);
  });

  it('reads an out-of-range value as no tone', () => {
    localStorage.setItem('emoji_tone', '9');
    expect(storedTone()).toBe(0);
  });
});

describe('quickRow', () => {
  const fire = { char: '🔥', name: 'fire' };
  const moon = { char: '🌙', name: 'moon' };
  const heart = { char: '❤️', name: 'heart' };

  it('puts the recent first, then the catalogue’s quick ones, each once', () => {
    expect(quickRow([moon], [heart, moon, fire])).toEqual([moon, heart, fire]);
  });

  it('keeps eight', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ char: String(i), name: String(i) }));
    expect(quickRow(many, [heart])).toHaveLength(8);
  });
});
