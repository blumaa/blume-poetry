/** A Supabase user or JWT claims: both carry app_metadata. */
type WithAppMetadata = { app_metadata?: Record<string, unknown> } | null | undefined;

/**
 * The single answer to "is this the admin?", on server and client alike.
 * The role lives in app_metadata, which only the service role can write
 * (never user_metadata, which the user can). Database policies check the same
 * claim through public.is_admin().
 */
export function hasAdminRole(subject: WithAppMetadata): boolean {
  return subject?.app_metadata?.role === 'admin';
}
