import { auth, currentUser } from '@clerk/nextjs/server';
import SettingsClient from '@/components/settings/SettingsClient';
import pool from '@/lib/db';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) return <div>Silakan login.</div>;

  const clerkUser = await currentUser();

  const [noteRes, folderRes, mediaRes, profileRes, notesListRes, foldersListRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM public.notes WHERE user_id = $1`, [userId]),
    pool.query(`SELECT COUNT(*) FROM public.folders WHERE user_id = $1`, [userId]),
    pool.query(
      `SELECT nm.media_url FROM public.note_media nm
       JOIN public.notes n ON n.id = nm.note_id
       WHERE n.user_id = $1 LIMIT 1000`,
      [userId]
    ),
    pool.query(
      `SELECT wa_status, wa_verify_token, whatsapp_number, full_name, education_level, avatar_url FROM public.profiles WHERE id = $1 LIMIT 1`,
      [userId]
    ),
    pool.query(
      `SELECT id, title, created_at, folder_id FROM public.notes WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    ),
    pool.query(
      `SELECT id, name FROM public.folders WHERE user_id = $1 ORDER BY name ASC`,
      [userId]
    )
  ]);

  const estimatedStorageMB = (mediaRes.rows.length * 200) / 1024;

  const email = clerkUser?.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress ?? '';

  const profile = profileRes.rows[0] || {};
  const waStatus = profile.wa_status || 'unlinked';
  const waToken = profile.wa_verify_token || null;
  const waNumber = profile.whatsapp_number || null;

  return (
    <SettingsClient
      user={{
        id: userId,
        email,
        full_name: profile.full_name || clerkUser?.fullName || clerkUser?.firstName || '',
        avatar_url: profile.avatar_url || clerkUser?.imageUrl || '',
        created_at: clerkUser?.createdAt ? new Date(clerkUser.createdAt).toISOString() : '',
        provider: 'google',
        education_level: profile.education_level || '',
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
      availableNotes={notesListRes.rows || []}
      availableFolders={foldersListRes.rows || []}
    />
  );
}
