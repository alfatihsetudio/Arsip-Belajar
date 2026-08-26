import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { syncUserDataByEmail } from '@/lib/sync-user';

/**
 * Clerk Webhook endpoint.
 *
 * Event yang ditangani:
 *   - user.created  → trigger saat user pertama kali mendaftar/login via OAuth
 *   - session.created → fallback saat user sudah ada tapi belum termigrasikan
 *
 * Setup di Clerk Dashboard:
 *   1. Buka Webhooks → Add Endpoint
 *   2. URL: https://<domain>/api/webhooks/clerk
 *   3. Events: user.created, session.created
 *   4. Copy Signing Secret → set CLERK_WEBHOOK_SECRET di .env.local
 */
export async function POST(req: NextRequest) {
  // verifyWebhook otomatis membaca CLERK_WEBHOOK_SECRET dari env
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;

  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error('[webhook/clerk] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { type, data } = evt;

  // Tangani user.created dan session.created
  if (type === 'user.created' || type === 'session.created') {
    try {
      const rawData = data as unknown as Record<string, unknown>;

      // Untuk session.created → data.user_id; untuk user.created → data.id
      const clerkUserId =
        type === 'session.created'
          ? (rawData.user_id as string | undefined)
          : (rawData.id as string | undefined);

      const emailAddresses = (rawData.email_addresses as Array<{
        email_address: string;
        verification?: { status: string };
      }> | undefined) ?? [];

      // Ambil email yang sudah terverifikasi, fallback ke email pertama
      const verifiedEmail =
        emailAddresses.find((e) => e.verification?.status === 'verified')?.email_address
        ?? emailAddresses[0]?.email_address;

      if (!clerkUserId || !verifiedEmail) {
        return NextResponse.json({ message: 'No user ID or email, skipping' });
      }

      const result = await syncUserDataByEmail(clerkUserId, verifiedEmail);
      if (result.migrated) {
        console.log(
          `[webhook/clerk] Migrated ${verifiedEmail}: ${result.oldId} → ${clerkUserId}`
        );
      }

      return NextResponse.json({ success: true, migrated: result.migrated });
    } catch (err) {
      console.error('[webhook/clerk] Sync failed:', err);
      // Kembalikan 200 agar Clerk tidak retry terus-menerus
      return NextResponse.json({ error: 'Sync failed, check server logs' }, { status: 200 });
    }
  }

  return NextResponse.json({ message: 'Event not handled' });
}
