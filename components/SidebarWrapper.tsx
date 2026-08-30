'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import type { TreeNode } from '@/lib/poems';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';

interface SidebarWrapperProps {
  tree: TreeNode[];
}

const COLLAPSED_KEY = 'sidebar_collapsed';
const MOBILE_QUERY = '(max-width: 767px)';

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

function subscribeMobile(listener: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', listener);
  return () => mql.removeEventListener('change', listener);
}

function readMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function SidebarWrapper({ tree }: SidebarWrapperProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Server snapshots: desktop, expanded — matches the server-rendered HTML.
  const isMobile = useSyncExternalStore(subscribeMobile, readMobile, () => false);
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
