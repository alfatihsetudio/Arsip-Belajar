'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveExamResult(data: {
  title: string;
  score: number;
  totalQuestions: number;
  difficulty: string;
  durationSeconds: number;
  topics: string;
  correctAnswers: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase
    .from('exam_results')
    .insert({
      user_id: user.id,
      title: data.title,
      score: data.score,
      total_questions: data.totalQuestions,
      difficulty: data.difficulty,
      duration_seconds: data.durationSeconds,
      topics: data.topics,
      correct_answers: data.correctAnswers,
    });

  if (error) {
    console.error('Failed to save exam result:', error);
    throw new Error('Gagal menyimpan hasil ujian');
  }

  // Revalidate to update the dashboard stats and archive
  revalidatePath('/dashboard/exams');
}
