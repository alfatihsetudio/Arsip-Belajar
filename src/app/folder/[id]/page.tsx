import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, parseFolderInfo } from '@/lib/site';
import DuplicateFolderButton from '@/components/folders/DuplicateFolderButton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: folder } = await supabase
    .from('folders')
    .select('name')
    .eq('id', id)
    .single();

  const folderInfo = parseFolderInfo(folder?.name || 'Folder');

  return {
    title: folderInfo.displayName,
    description: `${folderInfo.displayName} - ${SITE_DESCRIPTION}`,
    openGraph: {
      title: `${folderInfo.displayName} | ${SITE_NAME}`,
      description: `${folderInfo.displayName} - ${SITE_DESCRIPTION}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${folderInfo.displayName} | ${SITE_NAME}`,
      description: `${folderInfo.displayName} - ${SITE_DESCRIPTION}`,
    },
  };
}

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

  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = !user;

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

  const { displayName, description, color, emoji } = parseFolderInfo(folder.name);

  const { data: notes } = await supabase
    .from('notes')
    .select(`
      id, title, transcribed_text, created_at,
      note_media(media_url, order_index)
    `)
    .eq('folder_id', id)
    .order('created_at', { ascending: false });

  // Auto-save folder to user's shared folders history
  if (!isOwner && user) {
    supabase
      .from('shared_folders_history')
      .upsert({ user_id: user.id, folder_id: id, created_at: new Date().toISOString() }, { onConflict: 'user_id,folder_id' })
      .then(({ error: histErr }) => {
        if (histErr) console.error('Failed to log shared folders history', histErr);
      });
  }

  // Format date helper: HH:MM, DD Month YYYY
  const formatNoteDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = d.getDate();
    const month = d.toLocaleDateString('id-ID', { month: 'short' });
    const year = d.getFullYear();
    return `${hours}:${minutes}, ${day} ${month} ${year}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-12 flex items-center gap-2">
          {/* Back to dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Dashboard
          </Link>

          {/* Divider */}
          <span className="text-[var(--border)] select-none flex-shrink-0">|</span>

          {/* User avatar + name */}
          {user && (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                  {(user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="text-[11px] text-[var(--text-secondary)] truncate hidden sm:block">
                {user.user_metadata?.full_name || user.email}
              </span>
            </div>
          )}

          {/* Shared / Owner badge */}
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
            isOwner
              ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
              : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
          }`}>
            {isOwner ? '📝 Milik saya' : '🔗 Dibagikan'}
          </span>

          {!isOwner && (
            <div className="ml-auto flex-shrink-0">
              <DuplicateFolderButton folderId={id} isGuest={isGuest} />
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 w-full flex-1 flex flex-col min-h-0">
        {/* Breadcrumb / Title */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-[var(--border)] bg-[var(--surface)]"
            style={color ? { color: color } : {}}
          >
            {emoji}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight">{displayName}</h1>
            {description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>}
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {notes?.length || 0} catatan • Dibagikan oleh pemilik folder
            </p>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
          {notes && notes.length > 0 ? (
            notes.map((note) => {
              const thumbnail = note.note_media?.find((m) => m.order_index === 0)?.media_url;
              return (
                <Link
                  key={note.id}
                  href={`/note/${note.id}`}
                  className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-xl sm:rounded-2xl overflow-hidden hover:border-[var(--text-muted)] hover:shadow-md transition-all flex flex-col min-w-0"
                >
                  {thumbnail && (
                    <div className="h-24 sm:h-36 bg-[var(--surface-2)] overflow-hidden">
                      <img
                        src={thumbnail}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-2.5 sm:p-4 flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">{note.title}</h3>
                    <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed flex-1">
                      {note.transcribed_text || 'Tidak ada konten teks.'}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-1 border-t border-[var(--border)] pt-1.5 sm:pt-2">
                      <span className="text-[9px] sm:text-xs text-[var(--text-muted)] sm:ml-auto">
                        {formatNoteDate(note.created_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-[var(--border)] rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4 text-2xl">📭</div>
              <p className="text-[var(--text-primary)] font-bold">Folder Kosong</p>
              <p className="text-[var(--text-secondary)] text-sm mt-1">Belum ada catatan di dalam folder ini.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
