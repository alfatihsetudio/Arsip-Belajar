'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="border-b border-foreground/10 bg-background/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-xl tracking-tight">
          Arsip Belajar
        </Link>
        <button 
          onClick={handleLogout}
          className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
