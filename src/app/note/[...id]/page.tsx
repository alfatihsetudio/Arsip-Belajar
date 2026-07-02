import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import DuplicateButton from '@/components/notes/DuplicateButton';
import FlashcardsSection from '@/components/notes/FlashcardsSection';
import MindMapSection from '@/components/notes/MindMapSection';
import NoteChatAssistant from '@/components/notes/NoteChatAssistant';
import NoteExamSection from '@/components/notes/NoteExamSection';
import NoteLayoutWrapper from '@/components/notes/NoteLayoutWrapper';
import { parseNoteContent } from '@/lib/utils/flashcardHelper';
import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string[] }>;
}): Promise<Metadata> {
  const { id: idSegments } = await params;
  const id = idSegments.join('-');
  const supabase = await createClient();

  const { data: note } = await supabase
    .from('notes')
    .select('title')
    .eq('id', id)
    .single();

  const title = note?.title?.trim() || 'Catatan';

  return {
    title,
    description: `${title} - ${SITE_DESCRIPTION}`,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description: `${title} - ${SITE_DESCRIPTION}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description: `${title} - ${SITE_DESCRIPTION}`,
    },
  };
}

export default async function PublicNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string[] }>;
}) {
  const { id: idSegments } = await params;
  // Catch-all: join segments in case URL was split by WhatsApp or other messengers
  const id = idSegments.join('-');
  const supabase = await createClient();

  // ─── 1. Fetch the note ──────────────────────────────────────────────────
  const { data: note, error } = await supabase
    .from('notes')
    .select(`
      *,
      folders(id, visibility, allowed_emails),
      note_media(id, media_url, order_index, media_type)
    `)
    .eq('id', id)
    .single();

  if (error || !note) {
    notFound();
  }

  // ─── 2. Auth check ──────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = !user;
  const isOwner = user?.id === note.user_id;

  // ─── 3. Access control ──────────────────────────────────────────────────
  let visibility = note.visibility || 'private';
  let allowedEmails = note.allowed_emails || [];

  // Inherit visibility from parent folder if note is private but folder is shared
  if (visibility === 'private' && note.folders) {
    if (note.folders.visibility !== 'private') {
      visibility = note.folders.visibility;
      allowedEmails = note.folders.allowed_emails || [];
    }
  }

  // Guest users: redirect to login page so they can authenticate and return here
  if (isGuest) {
    const returnUrl = `/note/${id}`;
    redirect(`/?next=${encodeURIComponent(returnUrl)}`);
  }

  // Logged-in non-owner: check if they have access
  if (!isOwner) {
    if (visibility === 'private') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 text-center bg-[var(--bg)]">
          <div className="max-w-sm">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4 text-3xl">🔒</div>
            <h1 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Catatan Privat</h1>
            <p className="text-[var(--text-secondary)] mb-4 text-sm">Catatan ini bersifat privat dan hanya dapat dilihat oleh pemiliknya.</p>
            <Link href="/dashboard" className="inline-block bg-[var(--accent)] text-[var(--accent-fg)] px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      );
    }

    if (visibility === 'restricted' && !allowedEmails.includes(user!.email || '')) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 text-center bg-[var(--bg)]">
          <div className="max-w-sm">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4 text-3xl">⛔</div>
            <h1 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Akses Terbatas</h1>
            <p className="text-[var(--text-secondary)] mb-4 text-sm">
              Email <strong>{user!.email}</strong> tidak memiliki izin untuk melihat catatan ini.
              Hubungi pemilik catatan untuk meminta akses.
            </p>
            <Link href="/dashboard" className="inline-block bg-[var(--accent)] text-[var(--accent-fg)] px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      );
    }
  }

  // ─── 4. Auto-save to shared history (fire and forget) ───────────────────
  if (!isOwner && user) {
    supabase
      .from('shared_notes_history')
      .upsert({ user_id: user.id, note_id: note.id, created_at: new Date().toISOString() }, { onConflict: 'user_id,note_id' })
      .then(({ error: histErr }) => {
        if (histErr) console.error('Failed to log shared history', histErr);
      });
  }

  // ─── 5. Prepare data ────────────────────────────────────────────────────
  const sortedMedia = note.note_media && note.note_media.length > 0
    ? note.note_media
    : note.image_url
      ? [{ id: 'default', media_url: note.image_url, order_index: 0 }]
      : [];

  const { textContent, flashcards, mindmap } = parseNoteContent(note.transcribed_text || '');

  // ─── 6. Render ──────────────────────────────────────────────────────────
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

          {/* Save / Duplicate button — compact */}
          {!isOwner && (
            <Suspense fallback={null}>
              <DuplicateButton noteId={note.id} />
            </Suspense>
          )}
        </div>
      </header>

      {/* ── Banner: Shared note notice ──────────────────────────────────── */}
      {!isOwner && (
        <div className="bg-[var(--accent)]/5 border-b border-[var(--accent)]/10">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-secondary)]">
              📂 Anda melihat catatan milik orang lain. Catatan ini tersimpan di <strong>Catatan Dibagikan</strong> Anda.
              Perubahan yang Anda buat <strong>tidak</strong> mempengaruhi catatan asli.
            </p>
            <Link
              href="/dashboard/shared"
              className="text-[10px] font-bold text-[var(--accent)] hover:underline whitespace-nowrap flex-shrink-0"
            >
              Lihat Semua →
            </Link>
          </div>
        </div>
      )}

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 w-full flex-1 flex flex-col min-h-0">

        {/* Title */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">{note.title}</h1>
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">
            Dibuat pada {new Date(note.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Quick Nav */}
        <div className="mb-3 pb-2.5 border-b border-[var(--border)]">
          <span className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
            Fitur AI Catatan
          </span>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-1.5">
            {[
              { href: '#flashcards', emoji: '🎴', label: 'Flashcards' },
              { href: '#mindmap', emoji: '🗺️', label: 'Mind Map' },
              { href: '#chat', emoji: '💬', label: 'Tanya AI' },
              { href: '#exam-card', emoji: '📝', label: 'Latihan Soal' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center justify-center md:justify-start gap-1 py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-[10px] font-bold transition-all active:scale-95"
              >
                <span className="text-xs">{item.emoji}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Content + AI Sections */}
        <NoteLayoutWrapper sortedMedia={sortedMedia}>
          {/* Read-Only Text */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col min-h-[30vh]">
            <h2 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3 border-b border-[var(--border)] pb-2">
              Catatan Ekstraksi Teks
            </h2>
            <div className="text-xs sm:text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
              {textContent || 'Tidak ada teks yang diekstraksi dari catatan ini.'}
            </div>
          </div>

          {/* AI features — shown to all logged-in users, read-only for non-owners */}
          <div id="flashcards">
            <FlashcardsSection noteId={id} initialFlashcards={flashcards} isGuest={false} />
          </div>
          <div id="mindmap">
            <MindMapSection noteId={id} initialMindmap={mindmap} isGuest={false} />
          </div>
          <div id="chat">
            <NoteChatAssistant noteId={id} isGuest={false} />
          </div>
          <NoteExamSection noteId={id} isGuest={false} />
        </NoteLayoutWrapper>
      </main>
    </div>
  );
}
