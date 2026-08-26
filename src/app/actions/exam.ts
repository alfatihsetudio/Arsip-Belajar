'use server';
 
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';
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
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  await pool.query(
    `INSERT INTO public.exam_results (
      user_id, title, score, total_questions, difficulty, duration_seconds, topics, correct_answers
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      data.title,
      data.score,
      data.totalQuestions,
      data.difficulty,
      data.durationSeconds,
      data.topics,
      data.correctAnswers,
    ]
  );

  // Revalidate to update the dashboard stats and archive
  revalidatePath('/dashboard/exams');
}
