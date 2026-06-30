'use client';

import { useState } from 'react';

interface Note {
  id: string;
  title: string;
  created_at: string;
}

interface Question {
  question: string;
  options: string[];
  answer: string;
}

export default function GrandExamBuilder({ notes }: { notes: Note[] }) {
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');

  const toggleNote = (id: string) => {
    setSelectedNotes((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 10) return prev; // Limit to 10 notes
      return [...prev, id];
    });
  };

  const handleGenerate = async (count: number) => {
    if (selectedNotes.length === 0) return;
    setLoading(true);
    setError('');
    setSubmitted(false);
    setAnswers({});
    setQuestions([]);

    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteIds: selectedNotes,
          count,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate exam');
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

  if (notes.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-2xl">
        <p className="text-[var(--text-secondary)] font-medium">No notes available</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Upload notes first before building exams</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Note Selector List */}
          <div className="md:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-primary)] text-sm">Select notes (up to 10):</h2>
            <div className="divide-y divide-[var(--border)] max-h-[60vh] overflow-y-auto pr-2 space-y-1">
              {notes.map((note) => {
                const isChecked = selectedNotes.includes(note.id);
                return (
                  <label
                    key={note.id}
                    className={`flex items-start gap-3 py-3 px-2 cursor-pointer transition-colors hover:bg-[var(--surface-2)] rounded-lg`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleNote(note.id)}
                      className="mt-1 accent-[var(--accent)]"
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${isChecked ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {note.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Exam Setup Controller */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">Exam Setup</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Selected: <strong className="text-[var(--text-primary)]">{selectedNotes.length} / 10</strong> note(s)
            </p>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <div className="space-y-2 pt-2">
              <button
                disabled={loading || selectedNotes.length === 0}
                onClick={() => handleGenerate(5)}
                className="w-full py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Generate Quick Review (5 Qs)
              </button>
              <button
                disabled={loading || selectedNotes.length === 0}
                onClick={() => handleGenerate(20)}
                className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating Grand Exam...
                  </>
                ) : (
                  'Generate Grand Exam (20 Qs)'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : submitted ? (
        /* Results View */
        <div className="space-y-4 max-w-2xl mx-auto">
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

          <button onClick={() => setQuestions([])} className="w-full py-3 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
            Build Another Exam
          </button>
        </div>
      ) : (
        /* Exam taking flow */
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="flex justify-between items-center bg-[var(--surface-2)] px-4 py-3 rounded-xl border border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Exam in Progress</span>
            <span className="text-xs text-[var(--text-muted)]">{Object.keys(answers).length} / {questions.length} answered</span>
          </div>

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
            Submit Exam
          </button>
        </div>
      )}
    </div>
  );
}
