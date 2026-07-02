import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import NoteActions from '@/components/notes/NoteActions';
import NoteContentEditor from '@/components/notes/NoteContentEditor';
import NoteViewTracker from '@/components/notes/NoteViewTracker';
import FlashcardsSection from '@/components/notes/FlashcardsSection';
import MindMapSection from '@/components/notes/MindMapSection';
import NoteChatAssistant from '@/components/notes/NoteChatAssistant';
import NoteExamSection from '@/components/notes/NoteExamSection';
import NoteLayoutWrapper from '@/components/notes/NoteLayoutWrapper';
import { parseNoteContent } from '@/lib/utils/flashcardHelper';

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: note, error } = await supabase
    .from('notes')
    .select(`*, folder:folders(id, name), note_media(id, media_url, order_index, media_type)`)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !note) notFound();

  const sortedMedia = (note.note_media || []).sort((a: any, b: any) => a.order_index - b.order_index);
  const { flashcards, mindmap } = parseNoteContent(note.transcribed_text);

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      <NoteViewTracker noteId={id} />
      {/* Breadcrumb Note Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] overflow-x-auto whitespace-nowrap custom-scrollbar pb-1 sm:pb-0 min-w-0">
          <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors flex-shrink-0">
            Arsip Belajar
          </Link>
          
          {note.folder && (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="m9 18 6-6-6-6"/></svg>
              <Link 
                href={`/dashboard/folder/${note.folder.id}`} 
                className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 flex-shrink-0"
                style={(() => {
                  let color = '';
                  if (note.folder.name.startsWith('{')) {
                    try { color = JSON.parse(note.folder.name).color; } catch (e) {}
                  }
                  return color ? { color: color } : {};
                })()}
              >
                <span>
                  {(() => {
                    let emoji = '📁';
                    if (note.folder.name.startsWith('{')) {
                      try { emoji = JSON.parse(note.folder.name).emoji || emoji; } catch (e) {}
                    }
                    return emoji;
                  })()}
                </span>
                {(() => {
                  if (note.folder.name.startsWith('{')) {
                    try { return JSON.parse(note.folder.name).name; } catch (e) {}
                  }
                  return note.folder.name;
                })()}
              </Link>
            </>
          )}

          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="m9 18 6-6-6-6"/></svg>
          <span className="font-semibold text-[var(--text-primary)] truncate max-w-[150px] sm:max-w-[250px]">
            📄 {note.title}
          </span>
        </div>
        <div className="flex-shrink-0">
          <NoteActions 
            noteId={id} 
            noteTitle={note.title}
            initialVisibility={note.visibility}
            initialAllowedEmails={note.allowed_emails}
          />
        </div>
      </div>

      {/* Quick Navigation Shortcuts */}
      <div className="mb-3 pb-2.5 border-b border-[var(--border)]">
        <span className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Fitur AI Catatan</span>
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-1.5">
          <a 
            href="#flashcards" 
            className="flex items-center justify-center md:justify-start gap-1 py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
          >
            <span className="text-xs">🎴</span>
            <span>Flashcards</span>
          </a>
          <a 
            href="#mindmap" 
            className="flex items-center justify-center md:justify-start gap-1 py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
          >
            <span className="text-xs">🗺️</span>
            <span>Mind Map</span>
          </a>
          <a 
            href="#chat" 
            className="flex items-center justify-center md:justify-start gap-1 py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
          >
            <span className="text-xs">💬</span>
            <span>Tanya AI</span>
          </a>
          <a 
            href="#exam-card"
            className="flex items-center justify-center md:justify-start gap-1 py-1.5 px-2 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
          >
            <span className="text-xs">📝</span>
            <span>Latihan Soal</span>
          </a>
        </div>
      </div>

      {/* Split-Screen Content with Minimize & Lightbox Zoom/Pan features */}
      <NoteLayoutWrapper sortedMedia={sortedMedia}>
        <NoteContentEditor noteId={id} initialText={note.transcribed_text} />
        <div id="flashcards">
          <FlashcardsSection noteId={id} initialFlashcards={flashcards} />
        </div>
        <div id="mindmap">
          <MindMapSection noteId={id} initialMindmap={mindmap} />
        </div>
        <div id="chat">
          <NoteChatAssistant noteId={id} />
        </div>
        <NoteExamSection noteId={id} />
      </NoteLayoutWrapper>
    </div>
  );
}
