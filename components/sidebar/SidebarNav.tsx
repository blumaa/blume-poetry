import Link from 'next/link';
import { SideNav, SideNavItem } from '@/components/mds';
import type { PoemSearchHit, TreeNode } from '@/lib/poems';
import { TreeItem } from './TreeItem';
import styles from './SidebarNav.module.css';

interface SidebarNavProps {
  tree: TreeNode[];
  searchResults: PoemSearchHit[] | null;
  activeSlug?: string;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  /** Called when any poem link is clicked. */
  onNavigate?: () => void;
}

export function SidebarNav({
  tree,
  searchResults,
  activeSlug,
  expandedNodes,
  toggleNode,
  onNavigate,
}: SidebarNavProps) {
  return (
    <SideNav label="Poems" className={styles.nav}>
      {searchResults ? (
        <div>
          <div className={styles.resultsHeader}>
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </div>
          {searchResults.map((poem) => (
            <SideNavItem
              key={poem.id}
              as={Link}
              href={`/poem/${poem.slug}`}
              label={poem.title}
              active={poem.slug === activeSlug}
              onClick={onNavigate}
            />
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
    </SideNav>
  );
}
