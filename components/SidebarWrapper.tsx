'use client';

import { useState, useEffect } from 'react';
import type { TreeNode } from '@/lib/poems';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';

interface SidebarWrapperProps {
  tree: TreeNode[];
}

const COLLAPSED_KEY = 'sidebar_collapsed';

export function SidebarWrapper({ tree }: SidebarWrapperProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === 'true') {
      setIsCollapsed(true);
    }
  }, []);

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
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(COLLAPSED_KEY, String(newValue));
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
