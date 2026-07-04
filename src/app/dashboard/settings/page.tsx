import { createClient } from '@/lib/supabase/server';
import SettingsClient from '@/components/settings/SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Silakan login.</div>;

  // Fetch stats in parallel
  const [{ count: noteCount }, { count: folderCount }, { data: mediaRows }] = await Promise.all([
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('folders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    // Estimate storage from note_media rows — each row linked to user's notes
    supabase
      .from('note_media')
      .select('media_url, notes!inner(user_id)')
      .eq('notes.user_id', user.id)
      .limit(1000),
  ]);

  // Rough estimate: assume ~200KB average per image
  const estimatedStorageMB = ((mediaRows?.length ?? 0) * 200) / 1024;

  return (
    <SettingsClient
      user={{
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
        avatar_url: user.user_metadata?.avatar_url ?? '',
        created_at: user.created_at,
        provider: user.app_metadata?.provider ?? 'google',
        education_level: user.user_metadata?.education_level ?? '',
      }}
      stats={{
        noteCount: noteCount ?? 0,
        folderCount: folderCount ?? 0,
        storageMB: estimatedStorageMB,
      }}
    />
  );
}
