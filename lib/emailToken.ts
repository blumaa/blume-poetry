import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signed, tamper-proof tokens for links in outgoing email.
 *
 * A link in an email must work without a login, so it cannot carry the raw
 * email (anyone could act on anyone's address). Instead it carries
 * `base64url(email).base64url(HMAC-SHA256(purpose:email))`. Verification
 * recomputes the HMAC and compares in constant time, so only links this server
 * generated are honored.
 *
 * The purpose is inside the signature so a token minted for one action can't be
 * replayed as another — an unsubscribe link can't re-enable notifications.
 */

export type EmailTokenPurpose = 'unsubscribe' | 'notifications';

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error('Missing UNSUBSCRIBE_SECRET environment variable');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

/**
 * Create a token for an email + action. The email is normalized to lowercase so
 * tokens match however the address was originally cased.
 */
export function createEmailToken(email: string, purpose: EmailTokenPurpose): string {
  const normalized = email.toLowerCase();
  const payload = Buffer.from(normalized).toString('base64url');
  return `${payload}.${sign(`${purpose}:${normalized}`)}`;
}

function signaturesMatch(signature: string, expected: string): boolean {
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (signatureBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(signatureBuf, expectedBuf);
}

/**
 * Verify a token against the action it is being used for and return the email it
 * encodes, or null if it is malformed, tampered with, signed with a different
 * secret, or issued for a different purpose.
 *
 * `legacyUnscoped` additionally accepts the pre-purpose signature (HMAC over the
 * bare email) — needed only for unsubscribe links already sitting in inboxes.
 */
export function verifyEmailToken(
  token: string,
  purpose: EmailTokenPurpose,
  { legacyUnscoped = false }: { legacyUnscoped?: boolean } = {}
): string | null {
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

  if (signaturesMatch(signature, sign(`${purpose}:${email}`))) {
    return email;
  }

  if (legacyUnscoped && signaturesMatch(signature, sign(email))) {
    return email;
  }

  return null;
}
