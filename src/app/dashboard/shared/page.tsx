import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SharedNotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Silakan login.</div>;
  }

  // Fetch shared history joined with notes + note_media for thumbnail
  const { data: history } = await supabase
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
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Collect unique owner user_ids to fetch their profiles
  const ownerIds = [
    ...new Set(
      (history || [])
        .map((h: any) => h.notes?.user_id)
        .filter(Boolean)
    ),
  ] as string[];

  // Fetch owner info via RPC (reads from auth.users safely)
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


  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleDateString('id-ID', { month: 'short' });
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}, ${day} ${month} ${year}`;
  };

  const items = (history || []).filter((h: any) => h.notes);

  return (
    <div className="space-y-5 animate-fadeIn pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dibagikan kepada saya</h1>
        <p className="text-[var(--text-secondary)] mt-1 text-sm">
          Catatan dari orang lain yang pernah Anda buka — tersimpan otomatis.
        </p>
      </div>

      {items.length > 0 ? (
        /* ── Same grid as NotesList ─────────────────────────────────────── */
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
          {items.map((h: any) => {
            const note = h.notes;
            const thumbnail = note.note_media
              ?.sort((a: any, b: any) => a.order_index - b.order_index)
              ?.[0]?.media_url;

            const owner = ownerMap[note.user_id];
            const ownerName = owner?.name || `${note.user_id?.slice(0, 8)}…`;
            const ownerEmail = owner?.email || '';
            const ownerAvatar = owner?.avatar || '';

            const previewText = note.transcribed_text
              ? note.transcribed_text.replace(/#{1,6} /g, '').slice(0, 120)
              : null;

            return (
              <Link
                key={note.id}
                href={`/note/${note.id}`}
                className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-xl sm:rounded-2xl overflow-hidden hover:border-[var(--text-muted)] hover:shadow-md transition-all flex flex-col min-w-0"
              >
                {/* Thumbnail */}
                {thumbnail ? (
                  <div className="h-24 sm:h-36 bg-[var(--surface-2)] overflow-hidden">
                    <img
                      src={thumbnail}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  /* Placeholder saat tidak ada thumbnail */
                  <div className="h-16 sm:h-24 bg-gradient-to-br from-[var(--accent)]/10 to-[var(--surface-2)] flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]/40">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                )}

                {/* Card body */}
                <div className="p-2.5 sm:p-4 flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0">

                  {/* Title */}
                  <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate leading-tight">
                    {note.title || 'Tanpa Judul'}
                  </h3>

                  {/* Preview text */}
                  {previewText && (
                    <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed flex-1">
                      {previewText}
                    </p>
                  )}

                  {/* Footer: owner email + date */}
                  <div className="mt-auto border-t border-[var(--border)] pt-1.5 sm:pt-2 flex flex-col gap-1">
                    {/* From owner */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {ownerAvatar ? (
                        <img src={ownerAvatar} alt="" className="w-4 h-4 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                          {ownerName[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--text-primary)] truncate leading-tight">
                          {ownerName}
                        </p>
                        {ownerEmail && ownerEmail !== ownerName && (
                          <p className="text-[8px] sm:text-[9px] text-[var(--text-muted)] truncate leading-tight">
                            {ownerEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Last opened */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] sm:text-[10px] text-[var(--text-muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded-md font-medium">
                        🔗 Dibagikan
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-[var(--text-muted)]">
                        {formatDate(h.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ── Empty state ───────────────────────────────────────────────── */
        <div className="py-24 text-center border-2 border-dashed border-[var(--border)] rounded-3xl animate-fadeIn mt-4">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
          <p className="text-[var(--text-primary)] font-bold">Belum ada catatan</p>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xs mx-auto">
            Minta teman untuk membagikan link catatan, lalu buka link-nya agar tersimpan di sini.
          </p>
        </div>
      )}
    </div>
  );
}
