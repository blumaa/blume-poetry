'use client';

import { useState } from 'react';
import type { TreeNode } from '@/lib/poems';
import { collectionHome, type PoemCollection } from '@/lib/collections';
import { useIsMobile } from '@/lib/useMediaQuery';
import { useStored } from '@/lib/useStored';
import { writeStored } from '@/lib/browserStorage';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import styles from './SidebarWrapper.module.css';

interface SidebarWrapperProps {
  tree: TreeNode[];
  collection: PoemCollection;
}

/* The drawer's body-scroll lock and the main column's collapsed margin are
   CSS (Sidebar.module.css, globals.css), keyed off the sidebar's own state. */
export function SidebarWrapper({ tree, collection }: SidebarWrapperProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const isCollapsed = useStored('sidebarCollapsed') === 'true';

  const openMobileMenu = () => setIsMobileMenuOpen(true);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const toggleCollapse = () => {
    writeStored('sidebarCollapsed', String(!isCollapsed));
  };

  /* One Sidebar at every width, so its state (search, expanded folders, the
     footer subscribe form) survives a resize. isMobile only picks its
     presentation: drawer or collapsible rail. */
  return (
    <>
      <MobileHeader homeHref={collectionHome(collection)} onMenuClick={openMobileMenu} />

      {isMobile && (
        <div
          className={`${styles.overlay} ${isMobileMenuOpen ? styles.open : ''}`}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <Sidebar
        tree={tree}
        collection={collection}
        isMobile={isMobile}
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
    </>
  );
}
