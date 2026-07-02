import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SharedNotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Silakan login.</div>;
  }

  // Fetch shared history joined with notes
  const { data: history, error } = await supabase
    .from('shared_notes_history')
    .select(`
      created_at,
      notes (
        id,
        title,
        created_at,
        user_id
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dibagikan kepada saya</h1>
        <p className="text-[var(--text-secondary)] mt-1">Daftar catatan publik milik orang lain yang pernah Anda buka.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {history && history.length > 0 ? (
          history.map((h: any) => {
            const note = h.notes;
            if (!note) return null; // If note was deleted
            
            return (
              <Link 
                key={note.id} 
                href={`/note/${note.id}`}
                className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl hover:border-[var(--text-muted)] hover:shadow-md transition-all group relative flex flex-col min-h-[160px]"
              >
                <div className="flex justify-between items-start mb-auto">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </div>
                  <div className="text-[10px] font-semibold px-2 py-1 bg-[var(--surface-2)] text-[var(--text-muted)] rounded-full">
                    Terakhir dibuka: {new Date(h.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                
                <h3 className="font-bold text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] transition-colors mt-4 line-clamp-2">
                  {note.title || 'Tanpa Judul'}
                </h3>
              </Link>
            )
          })
        ) : (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-[var(--border)] rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4 text-2xl text-[var(--text-muted)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p className="text-[var(--text-primary)] font-bold">Belum ada riwayat</p>
            <p className="text-[var(--text-secondary)] text-sm mt-1 max-w-md mx-auto">Anda belum membuka catatan yang dibagikan oleh orang lain.</p>
          </div>
        )}
      </div>
    </div>
  );
}
