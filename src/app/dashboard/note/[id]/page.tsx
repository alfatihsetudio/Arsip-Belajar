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

  const { data: note, error } = await supabase
    .from('notes')
    .select(`*, folder:folders(id, name), note_media(id, media_url, order_index, media_type)`)
    .eq('id', id)
    .single();

  if (error || !note) notFound();

  const sortedMedia = (note.note_media || []).sort((a: any, b: any) => a.order_index - b.order_index);
  const { flashcards, mindmap } = parseNoteContent(note.transcribed_text);

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      <NoteViewTracker noteId={id} />
      {/* Note Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Link href="/dashboard" className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-[var(--text-primary)] truncate leading-tight">{note.title}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 leading-none">
              {note.folder && (
                <span 
                  className="text-[9px] font-semibold px-1.5 py-0.25 rounded-full whitespace-nowrap inline-block"
                  style={(() => {
                    let color = '';
                    if (note.folder.name.startsWith('{')) {
                      try { color = JSON.parse(note.folder.name).color; } catch (e) {}
                    }
                    return color ? { backgroundColor: `${color}15`, color: color } : { backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' };
                  })()}
                >
                  {(() => {
                    if (note.folder.name.startsWith('{')) {
                      try { return JSON.parse(note.folder.name).name; } catch (e) {}
                    }
                    return note.folder.name;
                  })()}
                </span>
              )}
              <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap inline-block">
                {(() => {
                  const d = new Date(note.created_at);
                  const hours = String(d.getHours()).padStart(2, '0');
                  const minutes = String(d.getMinutes()).padStart(2, '0');
                  const day = d.getDate();
                  const month = d.toLocaleDateString(undefined, { month: 'short' });
                  const year = d.getFullYear();
                  return `${hours}:${minutes}, ${day} ${month} ${year}`;
                })()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <NoteActions noteId={id} noteTitle={note.title} />
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
