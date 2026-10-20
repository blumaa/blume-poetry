import { buildPoemTree, getAllPoemsMeta } from '@/lib/poems';
import type { PoemCollection } from '@/lib/collections';
import { SidebarWrapper } from './SidebarWrapper';

export async function SidebarServer({ collection }: { collection: PoemCollection }) {
  const tree = buildPoemTree(await getAllPoemsMeta(collection));
  return <SidebarWrapper tree={tree} collection={collection} />;
}
