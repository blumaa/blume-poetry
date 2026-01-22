'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { useAuth } from '@/components/auth/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/admin/NotificationBell';

function AdminNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/poems', label: 'Poems' },
    { href: '/admin/subscribers', label: 'Subscribers' },
  ];

  return (
    <nav className="bg-surface-sidebar text-primary p-4">
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
                  pathname === item.href
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
          <main id="main-content" className="max-w-6xl mx-auto p-6">
            {children}
          </main>
        </div>
      </AdminGuard>
    </AuthProvider>
  );
}
