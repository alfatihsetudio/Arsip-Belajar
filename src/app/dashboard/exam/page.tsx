'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface Question {
  question: string;
  options: string[];
  answer: string;
}

function ExamContent() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get('noteId');
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');

  const generateQuiz = async () => {
    if (!noteId) return;
    setLoading(true);
    setError('');
    setSubmitted(false);
    setAnswers({});
    setQuestions([]);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, count: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.answer) correct++;
    });
    setScore(correct);
    setSubmitted(true);
  };

  const pct = Math.round((score / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Quick Exam</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">AI-generated multiple-choice questions from your note.</p>

      {questions.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-2xl">
          <svg className="mx-auto text-[var(--text-muted)] mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button onClick={generateQuiz} disabled={loading || !noteId} className="bg-[var(--accent)] text-[var(--accent-fg)] px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 mx-auto">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</> : 'Generate 5 Questions'}
          </button>
          {!noteId && <p className="text-xs text-[var(--text-muted)] mt-3">Open a note first to generate a quiz.</p>}
        </div>
      ) : submitted ? (
        <div className="space-y-4">
          <div className={`p-6 rounded-2xl text-center border ${pct >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-4xl font-bold ${pct >= 70 ? 'text-green-600' : 'text-red-500'}`}>{pct}%</p>
            <p className="text-sm font-medium mt-1">{score} / {questions.length} correct</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{pct >= 70 ? 'Great job! 🎉' : 'Keep studying! 💪'}</p>
          </div>
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.answer;
            return (
              <div key={i} className={`p-4 rounded-xl border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <p className="font-medium text-sm mb-2">{i + 1}. {q.question}</p>
                <p className="text-xs text-[var(--text-secondary)]">Your answer: <span className={isCorrect ? 'text-green-700 font-semibold' : 'text-red-600 line-through'}>{answers[i] || '(none)'}</span></p>
                {!isCorrect && <p className="text-xs text-green-700 font-semibold mt-0.5">Correct: {q.answer}</p>}
              </div>
            );
          })}
          <button onClick={generateQuiz} className="w-full py-3 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
              <p className="font-semibold text-sm text-[var(--text-primary)] mb-3">{i + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label key={opt} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${answers[i] === opt ? 'border-[var(--accent)] bg-[var(--surface-2)]' : 'border-[var(--border)] hover:bg-[var(--surface-2)]'}`}>
                    <input type="radio" name={`q-${i}`} value={opt} onChange={() => setAnswers(prev => ({ ...prev, [i]: opt }))} className="accent-[var(--accent)]" />
                    <span className="text-sm text-[var(--text-primary)]">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length} className="w-full py-3.5 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            Submit Answers ({Object.keys(answers).length}/{questions.length} answered)
          </button>
        </div>
      )}
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-40"><span className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin"/></div>}>
      <ExamContent />
    </Suspense>
  );
}
