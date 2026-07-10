import { createUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/unsubscribeToken';

describe('unsubscribeToken', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  });

  it('round-trips an email through create → verify', () => {
    const token = createUnsubscribeToken('reader@example.com');
    expect(verifyUnsubscribeToken(token)).toBe('reader@example.com');
  });

  it('normalizes email to lowercase', () => {
    const token = createUnsubscribeToken('Reader@Example.COM');
    expect(verifyUnsubscribeToken(token)).toBe('reader@example.com');
  });

  it('rejects a token with a tampered signature', () => {
    const token = createUnsubscribeToken('reader@example.com');
    const [payload] = token.split('.');
    const forged = `${payload}.deadbeefdeadbeef`;
    expect(verifyUnsubscribeToken(forged)).toBeNull();
  });

  it('rejects a token whose payload was swapped for a different email', () => {
    const token = createUnsubscribeToken('victim@example.com');
    const sig = token.split('.')[1];
    const attackerPayload = Buffer.from('attacker@example.com').toString('base64url');
    const forged = `${attackerPayload}.${sig}`;
    expect(verifyUnsubscribeToken(forged)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(verifyUnsubscribeToken('not-a-token')).toBeNull();
    expect(verifyUnsubscribeToken('')).toBeNull();
    expect(verifyUnsubscribeToken('a.b.c')).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = createUnsubscribeToken('reader@example.com');
    process.env.UNSUBSCRIBE_SECRET = 'a-different-secret';
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });
});
