'use client';

import { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import type { TreeNode } from '@/lib/poems';
import { searchPoems } from '@/features/poems';
import { queryKeys } from '@/lib/queryKeys';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { SidebarSearch } from './sidebar/SidebarSearch';
import { SidebarNav } from './sidebar/SidebarNav';
import { SidebarFooter } from './sidebar/SidebarFooter';
import styles from './Sidebar.module.css';

// Find path to a poem in the tree (returns parent node IDs)
function findPoemPath(nodes: TreeNode[], slug: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.type === 'poem' && node.slug === slug) {
      return path;
    }
    if (node.children) {
      const result = findPoemPath(node.children, slug, [...path, node.id]);
      if (result) return result;
    }
  }
  return null;
}

interface SidebarProps {
  tree: TreeNode[];
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  tree,
  isOpen = true,
  onClose,
  isMobile = false,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const debouncedQuery = useDebouncedValue(search, 300).trim();

  /* keepPreviousData: old results stay visible while the next query loads,
     so the list does not flash empty between keystrokes. */
  const { data: searchData } = useQuery({
    queryKey: queryKeys.poem.search(debouncedQuery),
    queryFn: () => searchPoems(debouncedQuery),
    enabled: !!debouncedQuery,
    placeholderData: keepPreviousData,
  });
  const searchResults = debouncedQuery ? searchData ?? null : null;

  const activeSlug = pathname.startsWith('/poem/')
    ? pathname.replace('/poem/', '')
    : undefined;

  /* Folders on the active poem's path open by default. A reader's click is an
     override that wins over the default, in either direction. */
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());

  const expandedNodes = useMemo(() => {
    const result = new Set(activeSlug ? findPoemPath(tree, activeSlug) ?? [] : []);
    for (const [id, open] of overrides) {
      if (open) result.add(id);
      else result.delete(id);
    }
    return result;
  }, [activeSlug, tree, overrides]);

  const toggleNode = (id: string) => {
    setOverrides((prev) => new Map(prev).set(id, !expandedNodes.has(id)));
  };

  // Shown on mobile, and on desktop unless collapsed to the icon rail.
  const showBody = isMobile || !isCollapsed;

  const asideClass = isMobile
    ? `${styles.mobileAside} ${isOpen ? styles.open : ''}`
    : `${styles.desktopAside} ${isCollapsed ? styles.collapsed : ''}`;

  /* One <aside> at every width; isMobile picks its presentation. A closed
     drawer is inert: off screen, so out of the tab order and the a11y tree.
     Links close the drawer on click; on desktop onClose is a no-op. */
  return (
    <aside
      className={asideClass}
      inert={isMobile && !isOpen}
      data-sidebar-collapsed={!isMobile && isCollapsed ? '' : undefined}
    >
      {isMobile ? (
        <SidebarHeader variant="mobile" onClose={onClose} />
      ) : (
        <SidebarHeader
          variant="desktop"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      )}

      {showBody && (
        <>
          <SidebarSearch id="search-poems" value={search} onChange={setSearch} />

          <SidebarNav
            tree={tree}
            searchResults={searchResults}
            activeSlug={activeSlug}
            expandedNodes={expandedNodes}
            toggleNode={toggleNode}
            onNavigate={onClose}
          />

          <SidebarFooter
            hint={
              isMobile ? (
                'Swipe left / right to navigate poems'
              ) : (
                <>
                  <kbd className={styles.kbd}>←</kbd>
                  {' / '}
                  <kbd className={styles.kbd}>→</kbd>
                  {' navigate'}
                </>
              )
            }
          />
        </>
      )}
    </aside>
  );
}
