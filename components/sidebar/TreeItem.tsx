import Link from 'next/link';
import type { TreeNode } from '@/lib/poems';

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
      <Link
        href={`/poem/${node.slug}`}
        onClick={() => onNavigate?.(node.slug!, node.label)}
        className={`block py-2 px-3 rounded text-sm truncate transition-colors min-h-[44px] flex items-center ${
          node.slug === activeSlug
            ? 'bg-active text-primary'
            : 'text-secondary hover:bg-hover hover:text-primary'
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
        className="w-full flex items-center gap-1 py-2 px-3 rounded text-sm text-secondary hover:bg-hover hover:text-primary transition-colors min-h-[44px]"
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
        aria-expanded={isExpanded}
        aria-controls={hasChildren ? `tree-children-${node.id}` : undefined}
      >
        <ChevronIcon expanded={isExpanded} />
        <span className="truncate">{node.label}</span>
        {node.count !== undefined && (
          <span className="ml-auto text-xs text-tertiary">{node.count}</span>
        )}
      </button>
      {isExpanded && hasChildren && (
        <div id={`tree-children-${node.id}`} role="group">
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
