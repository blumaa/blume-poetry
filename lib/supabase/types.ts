// Generated from the live schema by `bun run db:types`; never edit
// database.types.ts by hand. Run it after every migration.
import type { Database } from './database.types';

export type { Database, Json } from './database.types';

/* Row shapes, named for the table. The camelCase domain types (e.g. Poem in
   lib/poems) are separate; these are what the database returns. */
export type PoemRow = Database['public']['Tables']['poems']['Row'];
export type PoemInsert = Database['public']['Tables']['poems']['Insert'];
export type PoemStatus = Database['public']['Enums']['poem_status'];
export type SubscriberRow = Database['public']['Tables']['subscribers']['Row'];
export type CommentRow = Database['public']['Tables']['comments']['Row'];
export type PushSubscriptionRow = Database['public']['Tables']['push_subscriptions']['Row'];
