'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { useAuth } from '@/components/auth/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/admin/NotificationBell';

function AdminNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [showMobileMore, setShowMobileMore] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const navItems = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      href: '/admin/poems',
      label: 'Poems',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      href: '/admin/subscribers',
      label: 'Subscribers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Desktop nav - hidden on mobile */}
      <nav className="hidden md:block bg-surface-sidebar text-primary p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-medium hover:text-secondary transition-colors">
              Blumenous Poetry
            </Link>
            <div className="flex items-center gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm transition-colors ${
                    isActive(item.href)
                      ? 'text-primary'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle className="text-secondary" />
            <span className="text-sm text-tertiary ml-2">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-sm text-secondary hover:text-primary transition-colors ml-2"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav className="md:hidden bg-surface-sidebar text-primary px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-medium hover:text-secondary transition-colors text-sm">
          Blumenous
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle className="text-secondary" />
          <button
            onClick={() => setShowMobileMore(!showMobileMore)}
            className="p-2 text-secondary hover:text-primary transition-colors"
            aria-label="More options"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile more dropdown */}
      {showMobileMore && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setShowMobileMore(false)}>
          <div className="absolute top-14 right-4 bg-surface border border-border rounded-lg shadow-lg py-2 min-w-[180px]">
            <div className="px-4 py-2 text-xs text-tertiary truncate border-b border-border">
              {user?.email}
            </div>
            <button
              onClick={() => {
                setShowMobileMore(false);
                signOut();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors ${
                isActive(item.href)
                  ? 'text-accent font-medium'
                  : 'text-tertiary'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminGuard>
        <div className="min-h-screen bg-surface">
          <AdminNav />
          <main id="main-content" className="max-w-6xl mx-auto p-4 md:p-6 pb-16 md:pb-6">
            {children}
          </main>
        </div>
      </AdminGuard>
    </AuthProvider>
  );
}
