import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function PublicFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: folder, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !folder) {
    notFound();
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = !user;

  // Access Control Logic
  const visibility = folder.visibility || 'private';
  const allowedEmails = folder.allowed_emails || [];
  const isOwner = user?.id === folder.user_id;

  if (!isOwner) {
    let accessGranted = true;

    if (visibility === 'private') {
      accessGranted = false;
    } else if (visibility === 'restricted') {
      if (isGuest || !allowedEmails.includes(user.email || '')) {
        accessGranted = false;
      }
    }

    if (!accessGranted) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 text-center bg-[var(--bg)]">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Akses Folder Ditolak</h1>
            <p className="text-[var(--text-secondary)] mb-4">Folder ini bersifat privat atau Anda tidak memiliki izin.</p>
            {isGuest ? (
              <Link href="/" className="text-[var(--accent)] font-semibold hover:underline">Silakan Login Terlebih Dahulu</Link>
            ) : (
              <Link href="/dashboard" className="text-[var(--accent)] font-semibold hover:underline">Kembali ke Dashboard</Link>
            )}
          </div>
        </div>
      );
    }
  }

  // Parse folder info if JSON
  let displayName = folder.name;
  let description = '';
  let color = '';
  let emoji = '📁';
  if (folder.name && folder.name.startsWith('{')) {
    try {
      const parsed = JSON.parse(folder.name);
      displayName = parsed.name || folder.name;
      description = parsed.description || '';
      color = parsed.color || '';
      emoji = parsed.emoji || '📁';
    } catch (e) {
      // fallback
    }
  }

  // Fetch Notes inside this folder
  const { data: notes } = await supabase
    .from('notes')
    .select('id, title, created_at')
    .eq('folder_id', id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center gap-4 border-b border-[var(--border)] pb-6">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
            style={color ? { backgroundColor: `${color}15`, color: color } : { backgroundColor: 'var(--surface-2)' }}
          >
            {emoji}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{displayName}</h1>
            {description && <p className="text-[var(--text-secondary)] mt-1">{description}</p>}
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {notes?.length || 0} catatan • Dibagikan oleh pemilik folder
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {notes && notes.length > 0 ? (
            notes.map((note) => (
              <Link 
                key={note.id} 
                href={`/note/${note.id}`}
                className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl hover:border-[var(--text-muted)] hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </div>
                  <div className="text-[10px] font-semibold px-2 py-1 bg-[var(--surface-2)] text-[var(--text-muted)] rounded-full">
                    {new Date(note.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <h3 className="font-bold text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                  {note.title || 'Tanpa Judul'}
                </h3>
              </Link>
            ))
          ) : (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-[var(--border)] rounded-3xl">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4 text-2xl">📭</div>
              <p className="text-[var(--text-primary)] font-bold">Folder Kosong</p>
              <p className="text-[var(--text-secondary)] text-sm mt-1">Belum ada catatan di dalam folder ini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
