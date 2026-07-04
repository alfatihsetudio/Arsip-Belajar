import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import GrandExamBuilder from '@/components/exams/GrandExamBuilder';

export default async function ExamsDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: notes } = await supabase
    .from('notes')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .not('title', 'like', '💬%')
    .order('created_at', { ascending: false });

  const { data: examResults } = await supabase
    .from('exam_results')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const { data: folders } = await supabase
    .from('folders')
    .select('id, name, notes(id)')
    .eq('user_id', user.id);

  const { data: tags } = await supabase
    .from('tags')
    .select('id, name, note_tags(note_id)')
    .eq('user_id', user.id);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-10 px-4 sm:px-6 lg:px-8">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Exam Dashboard</h1>
        <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">
          Lacak performa belajar Anda dan buat ujian baru (Mock Exam) menggunakan AI.
        </p>
      </div>

      <GrandExamBuilder 
        notes={notes || []} 
        folders={folders || []} 
        tags={tags || []} 
        initialResults={examResults || []} 
      />
    </div>
  );
}
