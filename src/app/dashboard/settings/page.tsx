import { auth, currentUser } from '@clerk/nextjs/server';
import SettingsClient from '@/components/settings/SettingsClient';
import pool from '@/lib/db';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) return <div>Silakan login.</div>;

  const clerkUser = await currentUser();

  const [noteRes, folderRes, mediaRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM public.notes WHERE user_id = $1`, [userId]),
    pool.query(`SELECT COUNT(*) FROM public.folders WHERE user_id = $1`, [userId]),
    pool.query(
      `SELECT nm.media_url FROM public.note_media nm
       JOIN public.notes n ON n.id = nm.note_id
       WHERE n.user_id = $1 LIMIT 1000`,
      [userId]
    ),
  ]);

  const estimatedStorageMB = (mediaRes.rows.length * 200) / 1024;

  const email = clerkUser?.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress ?? '';

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
      stats={{
        noteCount: parseInt(noteRes.rows[0].count, 10),
        folderCount: parseInt(folderRes.rows[0].count, 10),
        storageMB: estimatedStorageMB,
      }}
    />
  );
}
