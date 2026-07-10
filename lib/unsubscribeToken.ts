import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signed, tamper-proof unsubscribe tokens.
 *
 * A one-click unsubscribe link in an email must work without a login, so the
 * link cannot carry the raw email (anyone could unsubscribe anyone). Instead it
 * carries `base64url(email).base64url(HMAC-SHA256(email))`. Verification
 * recomputes the HMAC and compares in constant time, so only links this server
 * generated are honored.
 */

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error('Missing UNSUBSCRIBE_SECRET environment variable');
  }
  return secret;
}

function sign(email: string): string {
  return createHmac('sha256', getSecret()).update(email).digest('base64url');
}

/**
 * Create an unsubscribe token for an email. The email is normalized to
 * lowercase so tokens match however the address was originally cased.
 */
export function createUnsubscribeToken(email: string): string {
  const normalized = email.toLowerCase();
  const payload = Buffer.from(normalized).toString('base64url');
  return `${payload}.${sign(normalized)}`;
}

/**
 * Verify a token and return the email it encodes, or null if the token is
 * malformed, tampered with, or signed with a different secret.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;

  let email: string;
  try {
    email = Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!email) return null;

  const expected = sign(email);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (signatureBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(signatureBuf, expectedBuf)) return null;

  return email;
}
