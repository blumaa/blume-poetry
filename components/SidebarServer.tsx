import { buildPoemTree } from '@/lib/poems';
import { SidebarWrapper } from './SidebarWrapper';

export async function SidebarServer() {
  const tree = await buildPoemTree();
  return <SidebarWrapper tree={tree} />;
}
