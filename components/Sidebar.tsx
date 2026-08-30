'use client';

import { useState, useMemo, useEffect, useEffectEvent } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import type { TreeNode, Poem } from '@/lib/poems';
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

async function searchPoems(query: string): Promise<Poem[]> {
  const res = await fetch(`/api/poems/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.poems;
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
    queryKey: ['poems', 'search', debouncedQuery],
    queryFn: () => searchPoems(debouncedQuery),
    enabled: !!debouncedQuery,
    placeholderData: keepPreviousData,
  });
  const searchResults = debouncedQuery ? searchData ?? null : null;
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set()
  );
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(
    new Set()
  );

  const activeSlug = pathname.startsWith('/poem/')
    ? pathname.replace('/poem/', '')
    : undefined;

  // Compute auto-expanded nodes based on active poem path
  // But respect manually collapsed nodes
  const effectiveExpandedNodes = useMemo(() => {
    const result = new Set(expandedNodes);
    if (activeSlug) {
      const parentPath = findPoemPath(tree, activeSlug);
      if (parentPath) {
        parentPath.forEach((id: string) => {
          // Only auto-expand if not manually collapsed
          if (!manuallyCollapsed.has(id)) {
            result.add(id);
          }
        });
      }
    }
    return result;
  }, [expandedNodes, activeSlug, tree, manuallyCollapsed]);

  // Close sidebar on navigation (mobile only). Effect event so the effect
  // reacts to pathname alone, reading current isMobile/onClose when it fires.
  const closeOnNavigate = useEffectEvent(() => {
    if (isMobile && onClose) {
      onClose();
    }
  });

  useEffect(() => {
    closeOnNavigate();
  }, [pathname]);

  const toggleNode = (id: string) => {
    const isCurrentlyExpanded = effectiveExpandedNodes.has(id);

    if (isCurrentlyExpanded) {
      // Collapsing - add to manually collapsed set
      setManuallyCollapsed((prev) => new Set([...prev, id]));
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      // Expanding - remove from manually collapsed and add to expanded
      setManuallyCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setExpandedNodes((prev) => new Set([...prev, id]));
    }
  };

  const handleTreeNavigate = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleSearchResultClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleCloseMenu = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Mobile sidebar
  if (isMobile) {
    return (
      <aside className={`sidebar-mobile ${isOpen ? 'open' : ''} ${styles.mobileAside}`}>
        <SidebarHeader variant="mobile" onClose={handleCloseMenu} />

        <SidebarSearch id="mobile-search-poems" value={search} onChange={setSearch} />

        <SidebarNav
          tree={tree}
          searchResults={searchResults}
          activeSlug={activeSlug}
          expandedNodes={effectiveExpandedNodes}
          toggleNode={toggleNode}
          onNavigate={handleTreeNavigate}
          onSearchResultClick={handleSearchResultClick}
        />

        <SidebarFooter hint="Swipe left / right to navigate poems" />
      </aside>
    );
  }

  // Desktop sidebar - collapsible
  return (
    <aside
      className={`${styles.desktopAside} ${isCollapsed ? styles.collapsed : ''}`}
    >
      <SidebarHeader
        variant="desktop"
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />

      {!isCollapsed && (
        <SidebarSearch id="desktop-search-poems" value={search} onChange={setSearch} />
      )}

      {!isCollapsed && (
        <SidebarNav
          tree={tree}
          searchResults={searchResults}
          activeSlug={activeSlug}
          expandedNodes={effectiveExpandedNodes}
          toggleNode={toggleNode}
        />
      )}

      {!isCollapsed && (
        <SidebarFooter
          hint={
            <>
              <kbd className={styles.kbd}>←</kbd>
              {' / '}
              <kbd className={styles.kbd}>→</kbd>
              {' navigate'}
            </>
          }
        />
      )}
    </aside>
  );
}
