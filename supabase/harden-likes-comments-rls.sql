-- Harden RLS on likes/comments: lock the anon key to read-only.
--
-- DEPLOYMENT ORDERING (IMPORTANT):
-- Deploy the application code FIRST (writes move to the service-role client),
-- THEN run this SQL. Running it before the code deploy would break
-- likes/comments for the window in between, since the old code paths write
-- via the anon client and depend on the permissive policies dropped below.

-- Remove the permissive policies that let the public anon key write directly
-- via PostgREST, bypassing the API's CSRF/rate-limit/validation checks.
DROP POLICY IF EXISTS "Public can insert likes" ON likes;
DROP POLICY IF EXISTS "Public can delete own likes" ON likes;
DROP POLICY IF EXISTS "Public can insert comments" ON comments;
DROP POLICY IF EXISTS "Admin can delete comments" ON comments;

-- The public SELECT policies ("Public can read likes", "Public can read
-- comments") are intentionally left in place — reads stay public.
--
-- With no INSERT/DELETE policies remaining on either table, the anon key
-- can no longer write to likes or comments under RLS. The service-role
-- client (used exclusively by the API routes for all writes) bypasses RLS
-- entirely, so writes continue to work there — they just can no longer be
-- performed directly against PostgREST with the public anon key.
