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
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Exam Builder</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Select notes to generate a personalized mock exam using AI.
        </p>
      </div>

      <GrandExamBuilder notes={notes || []} />
    </div>
  );
}
