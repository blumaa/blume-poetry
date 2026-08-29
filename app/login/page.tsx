import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Login | Blumenous Poetry',
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl text-primary hover:text-accent transition-colors">
            Blumenous Poetry
          </Link>
          <p className="text-secondary mt-2">Admin Login</p>
        </div>

        <div className="bg-surface-secondary p-8 rounded-lg border border-border shadow-sm">
          <LoginForm />
        </div>

        <p className="text-center mt-6 text-sm text-tertiary">
          <Link href="/" className="hover:text-primary transition-colors">
            &larr; Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
