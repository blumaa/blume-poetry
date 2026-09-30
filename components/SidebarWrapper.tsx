'use client';

import { useState, useEffect } from 'react';
import type { TreeNode } from '@/lib/poems';
import { useIsMobile } from '@/lib/useMediaQuery';
import { useStored } from '@/lib/useStored';
import { writeStored } from '@/lib/browserStorage';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';

interface SidebarWrapperProps {
  tree: TreeNode[];
}

export function SidebarWrapper({ tree }: SidebarWrapperProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const isCollapsed = useStored('sidebarCollapsed') === 'true';

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
    writeStored('sidebarCollapsed', String(!isCollapsed));
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
