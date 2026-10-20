import { Constants } from './supabase/database.types';
import type { PoemCollection } from './supabase/types';

export type { PoemCollection };

export function isPoemCollection(value: string): value is PoemCollection {
  return (Constants.public.Enums.poem_collection as readonly string[]).includes(value);
}

/** The collections as admin choices, main first. */
export const COLLECTION_CHOICES = [
  { value: 'main', label: 'Main' },
  { value: 'kinky', label: 'Kinky' },
] as const satisfies readonly { value: PoemCollection; label: string }[];

/* Where each collection lives. Every poem link is built here, so a collection's
   URLs have one source. */
const POEM_BASE: Record<PoemCollection, string> = { main: '/poem', kinky: '/kinky' };
const HOME: Record<PoemCollection, string> = { main: '/', kinky: '/kinky' };

export function poemHref(collection: PoemCollection, slug: string): string {
  return `${POEM_BASE[collection]}/${slug}`;
}

export function collectionHome(collection: PoemCollection): string {
  return HOME[collection];
}

/** The slug when `pathname` is one of the collection's poems. */
export function slugFromPath(collection: PoemCollection, pathname: string): string | undefined {
  const prefix = `${POEM_BASE[collection]}/`;
  return pathname.startsWith(prefix) ? pathname.slice(prefix.length) : undefined;
}
