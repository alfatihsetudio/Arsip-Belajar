import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import MainLayoutWrapper from '@/components/layout/MainLayoutWrapper';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/');

  return (
    <div className="flex h-full relative">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-auto">
        {/* Mobile top padding */}
        <div className="md:hidden h-14 flex-shrink-0" />
        <MainLayoutWrapper>
          {children}
        </MainLayoutWrapper>
      </div>
    </div>
  );
}
