'use client';

import { usePathname } from 'next/navigation';

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullScreen = pathname.startsWith('/dashboard/ai');

  if (isFullScreen) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-6 overflow-x-hidden">
      {children}
    </main>
  );
}
