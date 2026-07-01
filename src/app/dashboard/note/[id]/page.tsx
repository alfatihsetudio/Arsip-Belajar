import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import NoteActions from '@/components/notes/NoteActions';
import NoteContentEditor from '@/components/notes/NoteContentEditor';
import NoteViewTracker from '@/components/notes/NoteViewTracker';
import FlashcardsSection from '@/components/notes/FlashcardsSection';
import MindMapSection from '@/components/notes/MindMapSection';
import NoteChatAssistant from '@/components/notes/NoteChatAssistant';
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
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate leading-tight">{note.title}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 leading-none">
              {note.folder && (
                <span 
                  className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap inline-block"
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
              <span className="text-[10px] sm:text-xs text-[var(--text-muted)] whitespace-nowrap inline-block">
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
      <div className="flex flex-wrap gap-2 mb-5 pb-3.5 border-b border-[var(--border)]">
        <span className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider w-full mb-1">Fitur AI Catatan</span>
        <a 
          href="#flashcards" 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          🎴 AI Flashcards
        </a>
        <a 
          href="#mindmap" 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          🗺️ AI Mind Map
        </a>
        <a 
          href="#chat" 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          💬 Tanya Catatan (AI)
        </a>
      </div>

      {/* Split-Screen Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Left: Images (Horizontal snap-carousel on mobile, vertical scroll on desktop) */}
        {sortedMedia.length > 0 && (
          <div className="w-full md:w-2/5 flex-shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto snap-x snap-mandatory md:snap-none gap-3 pb-3 md:pb-0 pr-0 md:pr-2 scrollbar-none">
            {sortedMedia.map((media: any, i: number) => (
              <div key={media.id} className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] w-[85vw] md:w-full max-w-[340px] md:max-w-none flex-shrink-0 snap-center">
                <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded-md z-10">#{i + 1}</span>
                <img src={media.media_url} alt={`Page ${i + 1}`} className="w-full h-auto object-contain max-h-[50vh] md:max-h-[70vh]" />
              </div>
            ))}
          </div>
        )}

        {/* Right: Extracted Text, Flashcards, Mindmap & Chat */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-0 md:pr-1 pb-4">
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
        </div>
      </div>
    </div>
  );
}
