import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import GrandExamBuilder from '@/components/exams/GrandExamBuilder';
import pool from '@/lib/db';

export default async function ExamsDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const [notesRes, examResultsRes, foldersRes, tagsRes] = await Promise.all([
    pool.query(
      `SELECT id, title, created_at FROM public.notes
       WHERE user_id = $1 AND title NOT LIKE '💬%'
       ORDER BY created_at DESC`,
      [userId]
    ),
    pool.query(
      `SELECT * FROM public.exam_results WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    ),
    pool.query(
      `SELECT f.id, f.name,
         COALESCE(json_agg(json_build_object('id', n.id)) FILTER (WHERE n.id IS NOT NULL), '[]') AS notes
       FROM public.folders f
       LEFT JOIN public.notes n ON n.folder_id = f.id
       WHERE f.user_id = $1
       GROUP BY f.id`,
      [userId]
    ),
    pool.query(
      `SELECT t.id, t.name,
         COALESCE(json_agg(json_build_object('note_id', nt.note_id)) FILTER (WHERE nt.note_id IS NOT NULL), '[]') AS note_tags
       FROM public.tags t
       LEFT JOIN public.note_tags nt ON nt.tag_id = t.id
       WHERE t.user_id = $1
       GROUP BY t.id`,
      [userId]
    ),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-10 px-4 sm:px-6 lg:px-8">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Exam Dashboard</h1>
        <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">
          Lacak performa belajar Anda dan buat ujian baru (Mock Exam) menggunakan AI.
        </p>
      </div>

      <GrandExamBuilder
        notes={notesRes.rows}
        folders={foldersRes.rows}
        tags={tagsRes.rows}
        initialResults={examResultsRes.rows}
      />
    </div>
  );
}
