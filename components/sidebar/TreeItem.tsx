import Link from 'next/link';
import { SideNavItem } from '@/components/mds';
import type { TreeNode } from '@/lib/poems';
import styles from './TreeItem.module.css';

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ''}`}
    >
      <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

interface TreeItemProps {
  node: TreeNode;
  depth?: number;
  activeSlug?: string;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  onNavigate?: (slug: string, title: string) => void;
}

export function TreeItem({
  node,
  depth = 0,
  activeSlug,
  expandedNodes,
  toggleNode,
  onNavigate,
}: TreeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  if (node.type === 'poem') {
    return (
      <SideNavItem
        as={Link}
        href={`/poem/${node.slug}`}
        label={node.label}
        active={node.slug === activeSlug}
        onClick={() => onNavigate?.(node.slug!, node.label)}
      />
    );
  }

  // Folders stay hand-rolled: SideNavGroup has a static heading, and the
  // poem tree needs a collapsible disclosure.
  return (
    <div>
      <button
        onClick={() => toggleNode(node.id)}
        className={styles.folderButton}
        aria-expanded={isExpanded}
        aria-controls={hasChildren ? `tree-children-${node.id}` : undefined}
      >
        <ChevronIcon expanded={isExpanded} />
        <span className={styles.label}>{node.label}</span>
        {node.count !== undefined && (
          <span className={styles.count}>{node.count}</span>
        )}
      </button>
      {isExpanded && hasChildren && (
        <div id={`tree-children-${node.id}`} role="group" style={{ paddingLeft: `${(depth + 1) * 12}px` }}>
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
