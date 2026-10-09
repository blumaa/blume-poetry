import { buildPoemTree, getAllPoemsMeta } from '@/lib/poems';
import { SidebarWrapper } from './SidebarWrapper';

export async function SidebarServer() {
  const tree = buildPoemTree(await getAllPoemsMeta());
  return <SidebarWrapper tree={tree} />;
}
