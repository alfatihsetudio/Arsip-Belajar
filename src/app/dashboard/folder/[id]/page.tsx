import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import NotesList from '@/components/notes/NotesList';

export default async function DashboardFolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { id } = await params;
  const { q, tag } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch the folder
  const { data: folder, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !folder) {
    notFound();
  }

  // Parse folder info if JSON
  let displayName = folder.name;
  let color = '';
  let emoji = '📁';
  if (folder.name && folder.name.startsWith('{')) {
    try {
      const parsed = JSON.parse(folder.name);
      displayName = parsed.name || folder.name;
      color = parsed.color || '';
      emoji = parsed.emoji || '📁';
    } catch (e) {
      // fallback
    }
  }

  // Fetch notes inside this folder
  let query = supabase
    .from('notes')
    .select(`
      id, title, transcribed_text, created_at,
      folder:folders(id, name),
      note_media(media_url, order_index)
    `)
    .eq('user_id', user.id)
    .eq('folder_id', id)
    .order('created_at', { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,transcribed_text.ilike.%${q}%`);
  }

  const { data: notes } = await query;
  const { data: folders } = await supabase.from('folders').select('id, name').eq('user_id', user.id).order('name');

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fadeIn">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] overflow-x-auto whitespace-nowrap custom-scrollbar pb-1 sm:pb-0">
          <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">
            Arsip Belajar
          </Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1" style={color ? { color: color } : {}}>
            <span>{emoji}</span>
            {displayName}
          </span>
        </div>
        
        <Link href={`/dashboard/upload?folder=${id}`} className="hidden sm:flex flex-shrink-0 items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-fg)] px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Catatan Baru
        </Link>
      </div>

      {/* Search & Filter */}
      <form method="get" className="flex gap-2 max-w-xl">
        <div className="relative flex-1 flex items-center">
          <svg className="absolute left-2.5 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            name="q"
            defaultValue={q}
            placeholder={`Cari di folder ${displayName}...`}
            className="w-full pl-8 pr-16 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button type="submit" className="absolute right-1 px-2.5 py-1 bg-[var(--accent)] text-[var(--accent-fg)] rounded-md text-[10px] font-bold hover:opacity-90 transition-opacity">
            Cari
          </button>
        </div>
      </form>

      {/* Notes List */}
      <NotesList initialNotes={(notes as any[]) || []} folders={folders || []} />
    </div>
  );
}
