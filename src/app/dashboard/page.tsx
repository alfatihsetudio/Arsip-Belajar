import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import NotesList from '@/components/notes/NotesList';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; folder?: string; tag?: string }>;
}) {
  const { q, folder, tag } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null; // Next middleware should handle redirect
  }

  let query = supabase
    .from('notes')
    .select(`
      id, title, transcribed_text, created_at,
      folder:folders(id, name),
      note_media(media_url, order_index)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (q) {
    // Escape double quotes and wrap in double quotes to safely handle commas and spaces
    const safeQ = q.replace(/"/g, '""');
    query = query.or(`title.ilike."%${safeQ}%",transcribed_text.ilike."%${safeQ}%"`);
  }

  const { data: notes } = await query;
  const { data: folders } = await supabase.from('folders').select('id, name').eq('user_id', user.id).order('name');

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Notes</h1>
        <Link href={`/dashboard/upload${folder ? `?folder=${folder}` : ''}`} className="hidden sm:flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Note
        </Link>
      </div>

      {/* Search & Filter */}
      <form method="get" className="flex gap-2 max-w-xl">
        <div className="relative flex-1 flex items-center">
          <svg className="absolute left-2.5 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari catatan..."
            className="w-full pl-8 pr-20 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <div className="absolute right-1 flex items-center gap-1">
            {q && (
              <Link href="/dashboard" className="px-1.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs font-bold">
                ✕
              </Link>
            )}
            <button type="submit" className="px-2.5 py-1 bg-[var(--accent)] text-[var(--accent-fg)] rounded-md text-[10px] font-bold hover:opacity-90 transition-opacity">
              Cari
            </button>
          </div>
        </div>
      </form>

      {/* Notes Grid with Sorting & Folder Filter */}
      <NotesList initialNotes={(notes as any[]) || []} q={q} folder={folder} folders={folders || []} />
    </div>
  );
}
