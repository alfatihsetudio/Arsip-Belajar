'use client';

import Link from 'next/link';
import Image from 'next/image';
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
        <Link href="/dashboard" className="flex items-center gap-3 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white relative">
            <Image src="/logo.jpg" alt="Arsip Belajar" fill sizes="32px" className="object-cover" />
          </div>
          <span>Arsip Belajar</span>
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
