import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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
    query = query.textSearch('fts', q, { type: 'websearch' });
  }
  if (folder) {
    query = query.eq('folder_id', folder);
  }

  const { data: notes } = await query;
  const { data: folders } = await supabase.from('folders').select('id, name').order('name');

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Notes</h1>
        <Link href={`/dashboard/upload${folder ? `?folder=${folder}` : ''}`} className="hidden sm:flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Note
        </Link>
      </div>

      {/* Search & Filter */}
      <form method="get" className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search notes..."
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        {folders && folders.length > 0 && (
          <select name="folder" defaultValue={folder} className="px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors">
            <option value="">All Folders</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        <button type="submit" className="px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm font-medium hover:bg-[var(--border)] transition-colors">Search</button>
      </form>

      {/* Notes Grid */}
      {!notes || notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-[var(--border)] rounded-2xl">
          <svg className="text-[var(--text-muted)] mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <p className="text-[var(--text-secondary)] font-medium mb-1">{q ? 'No notes found' : 'No notes yet'}</p>
          <p className="text-sm text-[var(--text-muted)]">{q ? 'Try a different search term' : 'Upload your first note to get started'}</p>
          {!q && (
            <Link href="/dashboard/upload" className="mt-4 bg-[var(--accent)] text-[var(--accent-fg)] px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              Upload Note
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note: any) => {
            const thumbnail = note.note_media?.find((m: any) => m.order_index === 0)?.media_url;
            return (
              <Link key={note.id} href={`/dashboard/note/${note.id}`} className="group bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--text-muted)] hover:shadow-md transition-all flex flex-col">
                {thumbnail && (
                  <div className="h-36 bg-[var(--surface-2)] overflow-hidden">
                    <img src={thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">{note.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed flex-1">
                    {note.transcribed_text?.replace(/[#*`]/g, '')}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    {note.folder && (
                      <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">{note.folder.name}</span>
                    )}
                    <span className="text-xs text-[var(--text-muted)] ml-auto">
                      {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
