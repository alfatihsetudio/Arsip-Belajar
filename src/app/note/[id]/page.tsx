import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: note, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !note) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground/10 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* Image Section */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div className="rounded-2xl overflow-hidden border border-foreground/10 bg-foreground/5 shadow-sm">
              <img 
                src={note.image_url} 
                alt="Original note" 
                className="w-full h-auto object-contain max-h-[70vh]"
              />
            </div>
            <p className="text-xs text-foreground/50 text-center">
              Uploaded on {new Date(note.created_at).toLocaleString()}
            </p>
          </div>

          {/* Text Section */}
          <div className="w-full md:w-1/2 flex flex-col">
            <h1 className="text-2xl font-bold mb-6 text-foreground">Extracted Text</h1>
            <div className="prose prose-sm sm:prose-base prose-neutral max-w-none text-foreground whitespace-pre-wrap leading-relaxed bg-foreground/5 p-6 rounded-2xl border border-foreground/10 min-h-[50vh]">
              {note.transcribed_text || "No text was extracted from this image."}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
