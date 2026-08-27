import { auth, currentUser } from '@clerk/nextjs/server';
import SettingsClient from '@/components/settings/SettingsClient';
import pool from '@/lib/db';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) return <div>Silakan login.</div>;

  const clerkUser = await currentUser();

  const [noteRes, folderRes, mediaRes, profileRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM public.notes WHERE user_id = $1`, [userId]),
    pool.query(`SELECT COUNT(*) FROM public.folders WHERE user_id = $1`, [userId]),
    pool.query(
      `SELECT nm.media_url FROM public.note_media nm
       JOIN public.notes n ON n.id = nm.note_id
       WHERE n.user_id = $1 LIMIT 1000`,
      [userId]
    ),
    pool.query(
      `SELECT wa_status, wa_verify_token, whatsapp_number FROM public.profiles WHERE id = $1 LIMIT 1`,
      [userId]
    )
  ]);

  const estimatedStorageMB = (mediaRes.rows.length * 200) / 1024;

  const email = clerkUser?.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress ?? '';

  const waStatus = profileRes.rows[0]?.wa_status || 'unlinked';
  const waToken = profileRes.rows[0]?.wa_verify_token || null;
  const waNumber = profileRes.rows[0]?.whatsapp_number || null;

  return (
    <SettingsClient
      user={{
        id: userId,
        email,
        full_name: clerkUser?.fullName ?? clerkUser?.firstName ?? '',
        avatar_url: clerkUser?.imageUrl ?? '',
        created_at: clerkUser?.createdAt ? new Date(clerkUser.createdAt).toISOString() : '',
        provider: 'google',
        education_level: '',
      }}
      waInfo={{
        status: waStatus,
        token: waToken,
        number: waNumber,
      }}
      stats={{
        noteCount: parseInt(noteRes.rows[0].count, 10),
        folderCount: parseInt(folderRes.rows[0].count, 10),
        storageMB: estimatedStorageMB,
      }}
    />
  );
}
