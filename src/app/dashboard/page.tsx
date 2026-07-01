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

  let query = supabase
    .from('notes')
    .select(`
      id, title, transcribed_text, created_at,
      folder:folders(id, name),
      note_media(media_url, order_index)
    `)
    .order('created_at', { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,transcribed_text.ilike.%${q}%`);
  }

  const { data: notes } = await query;
  const { data: folders } = await supabase.from('folders').select('id, name').order('name');

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
            placeholder="Search notes..."
            className="w-full pl-8 pr-16 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button type="submit" className="absolute right-1 px-2.5 py-1 bg-[var(--accent)] text-[var(--accent-fg)] rounded-md text-[10px] font-bold hover:opacity-90 transition-opacity">
            Search
          </button>
        </div>
      </form>

      {/* Notes Grid with Sorting & Folder Filter */}
      <NotesList initialNotes={(notes as any[]) || []} q={q} folder={folder} folders={folders || []} />
    </div>
  );
}
