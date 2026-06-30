import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, image_url, transcribed_text, created_at')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">My Notes</h1>
      
      {!notes || notes.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-foreground/20 rounded-2xl">
          <p className="text-foreground/60 mb-4">You haven't uploaded any notes yet.</p>
          <Link href="/upload" className="text-accent font-medium hover:underline">
            Upload your first note
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <Link href={`/note/${note.id}`} key={note.id} className="group border border-foreground/10 rounded-2xl overflow-hidden hover:border-foreground/30 transition-colors bg-background flex flex-col h-64 shadow-sm">
              <div className="h-32 bg-foreground/5 relative overflow-hidden border-b border-foreground/5">
                <img src={note.image_url} alt="Note thumbnail" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-xs text-foreground/50 mb-2 font-medium tracking-wide">
                  {new Date(note.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-foreground text-sm line-clamp-3 leading-relaxed">
                  {note.transcribed_text || "No text extracted."}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link 
        href="/upload" 
        className="fixed bottom-8 right-8 sm:bottom-12 sm:right-12 bg-foreground text-background p-4 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center z-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </Link>
    </div>
  );
}
