'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import type { TreeNode } from '@/lib/poems';
import { useIsMobile } from '@/lib/useIsMobile';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';

interface SidebarWrapperProps {
  tree: TreeNode[];
}

const COLLAPSED_KEY = 'sidebar_collapsed';

/* Collapsed state lives in localStorage (survives reload); expose it as an
   external store so reads stay hydration-safe without a setState-in-effect. */
const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  return () => collapsedListeners.delete(listener);
}

function readCollapsed() {
  return localStorage.getItem(COLLAPSED_KEY) === 'true';
}

function writeCollapsed(value: boolean) {
  localStorage.setItem(COLLAPSED_KEY, String(value));
  collapsedListeners.forEach((listener) => listener());
}

export function SidebarWrapper({ tree }: SidebarWrapperProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const isCollapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Update CSS variable for main content margin
  useEffect(() => {
    if (!isMobile) {
      document.documentElement.style.setProperty(
        '--sidebar-current-width',
        isCollapsed ? '60px' : 'var(--sidebar-width)'
      );
    } else {
      document.documentElement.style.setProperty('--sidebar-current-width', '0px');
    }
  }, [isCollapsed, isMobile]);

  const openMobileMenu = () => setIsMobileMenuOpen(true);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const toggleCollapse = () => {
    writeCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile Header */}
      <MobileHeader onMenuClick={openMobileMenu} />

      {/* Desktop Sidebar */}
      <Sidebar
        tree={tree}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Mobile Sidebar Overlay */}
      {isMobile && (
        <>
          <div
            className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <Sidebar
            tree={tree}
            isOpen={isMobileMenuOpen}
            onClose={closeMobileMenu}
            isMobile={true}
          />
        </>
      )}
    </>
  );
}
