import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import FlashcardsSection from '@/components/notes/FlashcardsSection';
import MindMapSection from '@/components/notes/MindMapSection';
import NoteChatAssistant from '@/components/notes/NoteChatAssistant';
import NoteExamSection from '@/components/notes/NoteExamSection';
import NoteLayoutWrapper from '@/components/notes/NoteLayoutWrapper';
import { parseNoteContent } from '@/lib/utils/flashcardHelper';

export default async function PublicNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: note, error } = await supabase
    .from('notes')
    .select(`*, note_media(id, media_url, order_index, media_type)`)
    .eq('id', id)
    .single();

  if (error || !note) {
    notFound();
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = !user;

  // Media parsing with fallback for legacy image_url notes
  const sortedMedia = note.note_media && note.note_media.length > 0
    ? [...note.note_media].sort((a: any, b: any) => a.order_index - b.order_index)
    : note.image_url 
      ? [{ id: 'default', media_url: note.image_url, order_index: 0 }] 
      : [];

  const { textContent, flashcards, mindmap } = parseNoteContent(note.transcribed_text || '');

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Masuk ke Arsip Belajar
          </Link>
          <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-2)] px-2.5 py-1 rounded-md">
            Catatan Publik Shared
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 w-full flex-1 flex flex-col min-h-0">
        {/* Title */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">{note.title}</h1>
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">
            Dibuat pada {new Date(note.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Quick Navigation Shortcuts */}
        <div className="mb-3 pb-2.5 border-b border-[var(--border)]">
          <span className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Fitur AI Catatan (Pratinjau)</span>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-1.5">
            <Link 
              href={isGuest ? "/" : "#flashcards"} 
              className="flex items-center justify-center md:justify-start gap-1 py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            >
              <span className="text-xs">🎴</span>
              <span>Flashcards</span>
            </Link>
            <Link 
              href={isGuest ? "/" : "#mindmap"} 
              className="flex items-center justify-center md:justify-start gap-1 py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            >
              <span className="text-xs">🗺️</span>
              <span>Mind Map</span>
            </Link>
            <Link 
              href={isGuest ? "/" : "#chat"} 
              className="flex items-center justify-center md:justify-start gap-1 py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            >
              <span className="text-xs">💬</span>
              <span>Tanya AI</span>
            </Link>
            <Link 
              href={isGuest ? "/" : "#exam-card"}
              className="flex items-center justify-center md:justify-start gap-1 py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            >
              <span className="text-xs">📝</span>
              <span>Latihan Soal</span>
            </Link>
          </div>
        </div>

        {/* Split-Screen Content with Minimize & Lightbox Zoom/Pan features */}
        <NoteLayoutWrapper sortedMedia={sortedMedia}>
          {/* Read-Only Extracted Text */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col min-h-[30vh]">
            <h2 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3 border-b border-[var(--border)] pb-2">
              Catatan Ekstraksi Teks
            </h2>
            <div className="text-xs sm:text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
              {textContent || "Tidak ada teks yang diekstraksi dari catatan ini."}
            </div>
          </div>

          <div id="flashcards">
            <FlashcardsSection noteId={id} initialFlashcards={flashcards} isGuest={isGuest} />
          </div>
          <div id="mindmap">
            <MindMapSection noteId={id} initialMindmap={mindmap} isGuest={isGuest} />
          </div>
          <div id="chat">
            <NoteChatAssistant noteId={id} isGuest={isGuest} />
          </div>
          <NoteExamSection noteId={id} isGuest={isGuest} />
        </NoteLayoutWrapper>
      </main>
    </div>
  );
}
