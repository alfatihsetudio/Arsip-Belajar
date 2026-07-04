import { createClient } from '@/lib/supabase/server';
import SharedItemsList from '@/components/shared/SharedItemsList';

export default async function SharedItemsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Silakan login.</div>;
  }

  // 1. Fetch shared notes history
  const { data: noteHistory } = await supabase
    .from('shared_notes_history')
    .select(`
      created_at,
      notes (
        id,
        title,
        transcribed_text,
        created_at,
        user_id,
        note_media (
          media_url,
          order_index
        )
      )
    `)
    .eq('user_id', user.id);

  // 2. Fetch shared folders history safely
  let folderHistory: any[] = [];
  try {
    const { data } = await supabase
      .from('shared_folders_history')
      .select(`
        created_at,
        folders (
          id,
          name,
          user_id
        )
      `)
      .eq('user_id', user.id);
    if (data) {
      folderHistory = data;
    }
  } catch (e) {
    console.error('shared_folders_history table not found', e);
  }

  // 3. Collect unique owner user_ids to fetch their profiles
  const ownerIds = [
    ...new Set([
      ...(noteHistory || []).map((h: any) => h.notes?.user_id),
      ...(folderHistory || []).map((f: any) => f.folders?.user_id)
    ].filter(Boolean))
  ] as string[];

  // Fetch owner info via RPC
  let ownerMap: Record<string, { email: string; name: string; avatar: string }> = {};
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase.rpc('get_user_emails', { user_ids: ownerIds });
    if (owners) {
      owners.forEach((o: any) => {
        ownerMap[o.id] = {
          email: o.email || '',
          name: o.full_name || o.email || 'Pengguna',
          avatar: o.avatar_url || '',
        };
      });
    }
  }

  return (
    <div className="space-y-5 animate-fadeIn pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Dibagikan kepada saya</h1>
        <p className="text-[var(--text-secondary)] mt-0.5 text-[11px] sm:text-sm">
          Folder dan catatan dari orang lain yang pernah Anda buka — tersimpan otomatis.
        </p>
      </div>

      <SharedItemsList
        initialNotes={noteHistory || []}
        initialFolders={folderHistory || []}
        ownerMap={ownerMap}
      />
    </div>
  );
}
