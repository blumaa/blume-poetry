import Link from 'next/link';
import type { TreeNode, Poem } from '@/lib/poems';
import { TreeItem } from './TreeItem';

interface SidebarNavProps {
  tree: TreeNode[];
  searchResults: Poem[] | null;
  activeSlug?: string;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  onNavigate?: (slug: string, title: string) => void;
  onSearchResultClick?: () => void;
}

export function SidebarNav({
  tree,
  searchResults,
  activeSlug,
  expandedNodes,
  toggleNode,
  onNavigate,
  onSearchResultClick,
}: SidebarNavProps) {
  return (
    <nav className="flex-1 overflow-y-auto p-2">
      {searchResults ? (
        <div>
          <div className="px-3 py-2 text-xs text-tertiary uppercase tracking-wide">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </div>
          {searchResults.map((poem) => (
            <Link
              key={poem.id}
              href={`/poem/${poem.slug}`}
              onClick={onSearchResultClick}
              className={`block py-2 px-3 rounded text-sm truncate transition-colors min-h-[44px] flex items-center ${
                poem.slug === activeSlug
                  ? 'bg-active text-primary'
                  : 'text-secondary hover:bg-hover hover:text-primary'
              }`}
              title={poem.title}
            >
              {poem.title}
            </Link>
          ))}
        </div>
      ) : (
        tree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            activeSlug={activeSlug}
            expandedNodes={expandedNodes}
            toggleNode={toggleNode}
            onNavigate={onNavigate}
          />
        ))
      )}
    </nav>
  );
}
