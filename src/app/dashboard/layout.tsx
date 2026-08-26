import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import MainLayoutWrapper from '@/components/layout/MainLayoutWrapper';
import { ensureUserSynced } from '@/app/actions/sync-user';
import pool from '@/lib/db';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const user = await currentUser();
  if (!user) redirect('/');

  // Cek apakah profile dengan Clerk ID sudah ada (fast path, 1 query)
  const profileCheck = await pool.query(
    `SELECT id FROM public.profiles WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const alreadyMigrated = profileCheck.rows.length > 0;

  if (!alreadyMigrated) {
    // First login: AWAIT sync agar data muncul langsung setelah render
    await ensureUserSynced();
  }
  // Subsequent logins: sudah ada di DB, tidak perlu sync lagi

  const userForSidebar = {
    id: userId,
    email: user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
      ?? user.emailAddresses[0]?.emailAddress,
    user_metadata: {
      full_name: user.fullName ?? user.firstName ?? '',
      avatar_url: user.imageUrl ?? '',
    },
  };

  return (
    <div className="flex h-full relative">
      <Sidebar user={userForSidebar} />
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
