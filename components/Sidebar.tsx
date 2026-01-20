'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { TreeNode, Poem } from '@/lib/poems';
import { ThemeToggle } from './ThemeToggle';
import { SubscribeButton } from './SubscribeButton';
import { InfoButton } from './InfoButton';
import { SubscribeForm } from './SubscribeForm';

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

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
    >
      <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TreeItem({
  node,
  depth = 0,
  activeSlug,
  expandedNodes,
  toggleNode,
  onNavigate,
}: {
  node: TreeNode;
  depth?: number;
  activeSlug?: string;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  onNavigate?: () => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  if (node.type === 'poem') {
    return (
      <Link
        href={`/poem/${node.slug}`}
        onClick={onNavigate}
        className={`block py-2 px-3 rounded text-sm truncate transition-colors min-h-[44px] flex items-center ${
          node.slug === activeSlug
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
        title={node.label}
      >
        {node.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => toggleNode(node.id)}
        className="w-full flex items-center gap-1 py-2 px-3 rounded text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors min-h-[44px]"
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        <ChevronIcon expanded={isExpanded} />
        <span className="truncate">{node.label}</span>
        {node.count !== undefined && (
          <span className="ml-auto text-xs text-[var(--text-tertiary)]">{node.count}</span>
        )}
      </button>
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeSlug={activeSlug}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
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
  const [searchResults, setSearchResults] = useState<Poem[] | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['recent'])
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

  // Close sidebar on navigation (mobile only)
  useEffect(() => {
    if (isMobile && onClose) {
      onClose();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const res = await fetch(`/api/poems/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.poems);
    }
  };

  const handleNavigate = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Mobile sidebar classes
  if (isMobile) {
    return (
      <aside className={`sidebar-mobile ${isOpen ? 'open' : ''} w-full flex flex-col bg-[var(--bg-sidebar)] fixed left-0 top-0 z-50`}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <Link
            href="/"
            onClick={handleNavigate}
            className="text-lg font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Blumenous Poetry
          </Link>

          <div className="flex items-center gap-1">
            <InfoButton className="text-[var(--text-secondary)]" />
            <SubscribeButton className="text-[var(--text-secondary)]" />
            <ThemeToggle className="text-[var(--text-secondary)]" />
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Close navigation menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[var(--border)]">
          <label htmlFor="mobile-search-poems" className="sr-only">
            Search poems
          </label>
          <input
            id="mobile-search-poems"
            type="text"
            placeholder="Search poems..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded px-3 py-2 text-sm min-h-[44px] bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        {/* Tree / Search Results */}
        <nav className="flex-1 overflow-y-auto p-2">
          {searchResults ? (
            <div>
              <div className="px-3 py-2 text-xs text-[var(--text-tertiary)] uppercase tracking-wide">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map((poem) => (
                <Link
                  key={poem.id}
                  href={`/poem/${poem.slug}`}
                  onClick={handleNavigate}
                  className={`block py-2 px-3 rounded text-sm truncate transition-colors min-h-[44px] flex items-center ${
                    poem.slug === activeSlug
                      ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
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
                expandedNodes={effectiveExpandedNodes}
                toggleNode={toggleNode}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)]">
          <div className="mb-4">
            <p className="text-xs text-[var(--text-tertiary)] mb-2">Subscribe</p>
            <SubscribeForm compact />
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">
            Swipe left / right to navigate poems
          </div>
        </div>
      </aside>
    );
  }

  // Desktop sidebar - collapsible
  return (
    <aside
      className={`h-screen flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border)] fixed left-0 top-0 hidden md:flex transition-all duration-300 ${
        isCollapsed ? 'w-[60px]' : 'w-[var(--sidebar-width)]'
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b border-[var(--border)] ${isCollapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!isCollapsed && (
          <Link
            href="/"
            className="block text-lg font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors truncate mb-3"
          >
            Blumenous Poetry
          </Link>
        )}

        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'gap-1'}`}>
          {!isCollapsed && <InfoButton className="text-[var(--text-secondary)]" />}
          {!isCollapsed && <SubscribeButton className="text-[var(--text-secondary)]" />}
          {!isCollapsed && <ThemeToggle className="text-[var(--text-secondary)]" />}
          <button
            onClick={onToggleCollapse}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            >
              <path d="M11 17l-5-5 5-5" />
              <path d="M18 17l-5-5 5-5" />
            </svg>
          </button>
          {isCollapsed && <ThemeToggle className="text-[var(--text-secondary)]" />}
          {isCollapsed && <SubscribeButton className="text-[var(--text-secondary)]" />}
          {isCollapsed && <InfoButton className="text-[var(--text-secondary)]" />}
        </div>
      </div>

      {/* Search - hidden when collapsed */}
      {!isCollapsed && (
        <div className="p-3 border-b border-[var(--border)]">
          <label htmlFor="desktop-search-poems" className="sr-only">
            Search poems
          </label>
          <input
            id="desktop-search-poems"
            type="text"
            placeholder="Search poems..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded px-3 py-2 text-sm min-h-[44px] bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      )}

      {/* Tree / Search Results - hidden when collapsed */}
      {!isCollapsed && (
        <nav className="flex-1 overflow-y-auto p-2">
          {searchResults ? (
            <div>
              <div className="px-3 py-2 text-xs text-[var(--text-tertiary)] uppercase tracking-wide">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map((poem) => (
                <Link
                  key={poem.id}
                  href={`/poem/${poem.slug}`}
                  className={`block py-2 px-3 rounded text-sm truncate transition-colors min-h-[44px] flex items-center ${
                    poem.slug === activeSlug
                      ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
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
                expandedNodes={effectiveExpandedNodes}
                toggleNode={toggleNode}
              />
            ))
          )}
        </nav>
      )}

      {/* Footer - hidden when collapsed */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[var(--border)]">
          <div className="mb-4">
            <p className="text-xs text-[var(--text-tertiary)] mb-2">Subscribe</p>
            <SubscribeForm compact />
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">
            <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[var(--text-tertiary)]">←</kbd>
            {' / '}
            <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[var(--text-tertiary)]">→</kbd>
            {' navigate'}
          </div>
        </div>
      )}
    </aside>
  );
}
