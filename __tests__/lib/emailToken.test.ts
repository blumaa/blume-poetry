import { createHmac } from 'crypto';
import { createEmailToken, verifyEmailToken } from '@/lib/emailToken';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/unsubscribeToken';

describe('purpose-scoped email tokens', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  });

  it('round-trips the email it was issued for', () => {
    const token = createEmailToken('Reader@Example.com', 'notifications');
    expect(verifyEmailToken(token, 'notifications')).toBe('reader@example.com');
  });

  it('never carries the raw email in the link', () => {
    const token = createEmailToken('reader@example.com', 'notifications');
    expect(token).not.toContain('reader@example.com');
    expect(token).not.toContain('@');
  });

  it('rejects a token issued for a different purpose', () => {
    const token = createEmailToken('reader@example.com', 'unsubscribe');
    expect(verifyEmailToken(token, 'notifications')).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const token = createEmailToken('reader@example.com', 'notifications');
    const [, signature] = token.split('.');
    const forged = `${Buffer.from('victim@example.com').toString('base64url')}.${signature}`;

    expect(verifyEmailToken(forged, 'notifications')).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = createEmailToken('reader@example.com', 'notifications');
    process.env.UNSUBSCRIBE_SECRET = 'a-different-secret';

    expect(verifyEmailToken(token, 'notifications')).toBeNull();
  });

  it.each(['', 'nonsense', 'a.b.c'])('rejects the malformed token %p', (token) => {
    expect(verifyEmailToken(token, 'notifications')).toBeNull();
  });
});

describe('unsubscribe token compatibility', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-secret-value';
  });

  it('still verifies tokens minted by the current code', () => {
    expect(verifyUnsubscribeToken(createUnsubscribeToken('Reader@Example.com'))).toBe(
      'reader@example.com'
    );
  });

  it('still verifies legacy unsigned-purpose tokens already sitting in inboxes', () => {
    // Exactly what the pre-purpose implementation produced: HMAC over the bare email.
    const email = 'reader@example.com';
    const legacy = `${Buffer.from(email).toString('base64url')}.${createHmac(
      'sha256',
      'test-secret-value'
    )
      .update(email)
      .digest('base64url')}`;

    expect(verifyUnsubscribeToken(legacy)).toBe(email);
  });

  it('does not accept a notifications token as an unsubscribe token', () => {
    const token = createEmailToken('reader@example.com', 'notifications');
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });
});
