import { createEmailToken, verifyEmailToken } from './emailToken';

/**
 * Unsubscribe links, expressed in terms of the shared token module.
 *
 * Verification accepts the pre-purpose signature as well, so unsubscribe links
 * in already-delivered emails keep working. New links are purpose-scoped.
 */

export function createUnsubscribeToken(email: string): string {
  return createEmailToken(email, 'unsubscribe');
}

export function verifyUnsubscribeToken(token: string): string | null {
  return verifyEmailToken(token, 'unsubscribe', { legacyUnscoped: true });
}
