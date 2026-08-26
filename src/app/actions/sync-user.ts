'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { syncUserDataByEmail } from '@/lib/sync-user';

/**
 * Server Action: dipanggil di dashboard layout sebagai fallback.
 *
 * Jika webhook Clerk belum dikonfigurasi, fungsi ini memastikan
 * migrasi tetap terjadi saat user pertama kali membuka dashboard.
 *
 * Idempoten – aman dipanggil berkali-kali.
 */
export async function ensureUserSynced(): Promise<void> {
  try {
    const { userId } = await auth();
    if (!userId) return;

    const user = await currentUser();
    if (!user) return;

    const email =
      user.emailAddresses.find(
        (e) => e.id === user.primaryEmailAddressId
      )?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

    if (!email) return;

    await syncUserDataByEmail(userId, email);
  } catch (err) {
    // Jangan biarkan error migrasi memblokir dashboard
    console.error('[ensureUserSynced] Error:', err);
  }
}
