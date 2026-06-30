import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import NoteActions from '@/components/notes/NoteActions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      {/* Note Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--text-primary)] truncate">{note.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {note.folder && (
              <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">{note.folder.name}</span>
            )}
            <span className="text-xs text-[var(--text-muted)]">
              {new Date(note.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        <NoteActions noteId={id} noteTitle={note.title} />
      </div>

      {/* Split-Screen Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Left: Images */}
        {sortedMedia.length > 0 && (
          <div className="w-full md:w-2/5 flex-shrink-0 overflow-y-auto space-y-3 pr-0 md:pr-2">
            {sortedMedia.map((media: any, i: number) => (
              <div key={media.id} className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]">
                <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded-md z-10">#{i + 1}</span>
                <img src={media.media_url} alt={`Page ${i + 1}`} className="w-full h-auto object-contain max-h-[70vh]" />
              </div>
            ))}
          </div>
        )}

        {/* Right: Extracted Text */}
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 overflow-y-auto min-h-[50vh] md:min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Extracted Text</h2>
            <Link
              href={`/dashboard/exam?noteId=${id}`}
              className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Quick Exam
            </Link>
          </div>
          <div className="prose prose-slate prose-sm md:prose-base max-w-none prose-p:my-2 prose-li:my-0 prose-ul:my-2 text-[var(--text-primary)] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.transcribed_text}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
