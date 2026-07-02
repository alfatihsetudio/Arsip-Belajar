'use client';

import { useState } from 'react';

interface Question {
  question: string;
  options: string[];
  answer: string;
}

interface NoteExamSectionProps {
  noteId: string;
  isGuest?: boolean;
}

export default function NoteExamSection({ noteId, isGuest = false }: NoteExamSectionProps) {
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState('sedang');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');

  // Dropdown open states
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isCountOpen, setIsCountOpen] = useState(false);
  const [isHeaderDiffOpen, setIsHeaderDiffOpen] = useState(false);
  const [isHeaderCountOpen, setIsHeaderCountOpen] = useState(false);

  const clearQuiz = () => {
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setError('');
  };

  const generateQuiz = async () => {
    if (isGuest) {
      window.location.href = '/';
      return;
    }
    setLoading(true);
    setError('');
    setSubmitted(false);
    setAnswers({});
    setQuestions([]);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, count, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat latihan soal');
      setQuestions(data.questions || []);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.answer) correct++;
    });
    setScore(correct);
    setSubmitted(true);
  };

  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div id="exam-card" className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 text-left flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[var(--border)] pb-2.5 flex-shrink-0 relative">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide truncate">
            Latihan Soal
          </h2>
        </div>
        
        {/* Header difficulty and regen controls if quiz is active (Unified in 1 Card/Capsule) */}
        {questions.length > 0 && !loading && (
          <div className="flex items-center gap-1.5 justify-center sm:justify-end w-full sm:w-auto">
            <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-0.5 shadow-sm">
              {/* Header Difficulty Select */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsHeaderDiffOpen(!isHeaderDiffOpen)}
                  className="appearance-none pl-2 pr-5 py-1 bg-transparent text-[var(--text-primary)] cursor-pointer text-[10px] font-bold transition-all focus:outline-none flex items-center gap-1"
                >
                  <span>{difficulty === 'mudah' ? 'Mudah' : difficulty === 'sedang' ? 'Sedang' : 'Sulit'}</span>
                  <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[var(--text-muted)]">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </button>
                {isHeaderDiffOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsHeaderDiffOpen(false)} />
                    <div className="absolute right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-40 py-1 text-[10px] w-20 overflow-hidden">
                      {['mudah', 'sedang', 'sulit'].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => { setDifficulty(diff); setIsHeaderDiffOpen(false); }}
                          className={`w-full text-left px-2 py-1 hover:bg-[var(--surface-2)] font-semibold capitalize ${difficulty === diff ? 'text-[var(--accent)] bg-[var(--surface-2)]' : 'text-[var(--text-primary)]'}`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
 
              {/* Separator */}
              <div className="h-3.5 w-px bg-[var(--border)]" />
 
              {/* Header Count Select */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsHeaderCountOpen(!isHeaderCountOpen)}
                  className="appearance-none pl-2 pr-5 py-1 bg-transparent text-[var(--text-primary)] cursor-pointer text-[10px] font-bold transition-all focus:outline-none flex items-center justify-between gap-1"
                >
                  <span>{count} Soal</span>
                  <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[var(--text-muted)]">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </button>
                {isHeaderCountOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsHeaderCountOpen(false)} />
                    <div className="absolute right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-40 py-1 text-[10px] w-20 overflow-hidden">
                      {[3, 5, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => { setCount(num); setIsHeaderCountOpen(false); }}
                          className={`w-full text-left px-2 py-1 hover:bg-[var(--surface-2)] font-semibold ${count === num ? 'text-[var(--accent)] bg-[var(--surface-2)]' : 'text-[var(--text-primary)]'}`}
                        >
                          {num} Soal
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
 
              {/* Separator */}
              <div className="h-3.5 w-px bg-[var(--border)]" />
 
              {/* Regen Button */}
              <button
                onClick={generateQuiz}
                className="text-[10px] font-bold bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 transition-all active:scale-95 cursor-pointer flex items-center gap-0.5"
                title="Buat Ulang Soal"
              >
                🔄 Regen
              </button>
            </div>
 
            {/* Standalone Clear/Delete Button */}
            <button
              onClick={clearQuiz}
              className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-[var(--surface-2)] border border-[var(--border)] px-2 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-0.5 shadow-sm hover:bg-red-50/50 hover:border-red-200"
              title="Bersihkan Soal"
            >
              🗑️ Hapus
            </button>
          </div>
        )}
      </div>

      {/* Screen 1: Start Quiz */}
      {questions.length === 0 && !loading && (
        <div className="space-y-4">
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Uji pemahaman materi Anda dengan latihan soal pilihan ganda yang dihasilkan otomatis berdasarkan isi catatan ini.
          </p>
          
          {/* Difficulty & Count Selection side-by-side (Sleek custom dropdowns) */}
          <div className="flex gap-3 w-full relative">
            {/* Difficulty */}
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Kesulitan</span>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => { setIsDiffOpen(!isDiffOpen); setIsCountOpen(false); }}
                  className="w-full flex items-center justify-between pl-3 pr-8 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl font-bold text-[var(--text-primary)] text-xs transition-all hover:border-[var(--text-muted)] shadow-sm text-left cursor-pointer"
                >
                  <span className="capitalize">{difficulty}</span>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--text-muted)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </button>
                {isDiffOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsDiffOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-40 py-1 text-xs animate-fadeIn overflow-hidden">
                      {['mudah', 'sedang', 'sulit'].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => { setDifficulty(diff); setIsDiffOpen(false); }}
                          className={`w-full text-left px-3 py-2 hover:bg-[var(--surface-2)] transition-colors font-semibold capitalize ${difficulty === diff ? 'text-[var(--accent)] bg-[var(--surface-2)]' : 'text-[var(--text-primary)]'}`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Question Count */}
            <div className="w-24 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Jumlah Soal</span>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => { setIsCountOpen(!isCountOpen); setIsDiffOpen(false); }}
                  className="w-full flex items-center justify-between pl-3 pr-8 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl font-bold text-[var(--text-primary)] text-xs transition-all hover:border-[var(--text-muted)] shadow-sm text-left cursor-pointer"
                >
                  <span>{count} Soal</span>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--text-muted)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </button>
                {isCountOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsCountOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-40 py-1 text-xs animate-fadeIn overflow-hidden">
                      {[3, 5, 10, 15].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => { setCount(num); setIsCountOpen(false); }}
                          className={`w-full text-left px-3 py-2 hover:bg-[var(--surface-2)] transition-colors font-semibold ${count === num ? 'text-[var(--accent)] bg-[var(--surface-2)]' : 'text-[var(--text-primary)]'}`}
                        >
                          {num} Soal
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-[10px] text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200">{error}</p>}
          <button
            onClick={generateQuiz}
            className="px-4 py-2.5 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 w-full cursor-pointer text-center"
          >
            <span>Mulai Latihan Soal</span>
          </button>
        </div>
      )}

      {/* Screen 2: Loading State */}
      {loading && (
        <div className="py-6 text-center space-y-3">
          <span className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin inline-block" />
          <p className="text-[11px] text-[var(--text-muted)] font-medium">AI sedang menyusun pertanyaan untuk Anda...</p>
        </div>
      )}

      {/* Screen 3: Quiz Questions */}
      {questions.length > 0 && !submitted && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={i} className="space-y-2 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
              <p className="font-bold text-xs text-[var(--text-primary)]">{i + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {q.options.map((opt) => {
                  const isChecked = answers[i] === opt;
                  return (
                    <label key={opt} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                      isChecked ? 'border-[var(--accent)] bg-[var(--surface-2)] font-semibold' : 'border-[var(--border)] hover:bg-[var(--surface-2)]'
                    }`}>
                      <input 
                        type="radio" 
                        name={`inline-q-${i}`} 
                        value={opt} 
                        checked={isChecked}
                        onChange={() => setAnswers(prev => ({ ...prev, [i]: opt }))} 
                        className="accent-[var(--accent)] w-3.5 h-3.5" 
                      />
                      <span className="text-xs text-[var(--text-primary)] leading-normal">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <button 
            onClick={handleSubmit} 
            disabled={Object.keys(answers).length < questions.length} 
            className="w-full py-2.5 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            Kirim Jawaban ({Object.keys(answers).length}/{questions.length} Terjawab)
          </button>
        </div>
      )}

      {/* Screen 4: Results */}
      {questions.length > 0 && submitted && (
        <div className="space-y-4 animate-fadeIn">
          {/* Score Header */}
          <div className={`p-4 rounded-xl text-center border ${pct >= 70 ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
            <p className={`text-3xl font-black ${pct >= 70 ? 'text-green-600' : 'text-red-500'}`}>{pct}%</p>
            <p className="text-[11px] font-bold mt-1 text-[var(--text-primary)]">{score} / {questions.length} Benar</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{pct >= 70 ? 'Luar biasa! 🎉' : 'Ayo coba belajar lagi! 💪'}</p>
          </div>

          {/* Inline correction reviews */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {questions.map((q, i) => {
              const isCorrect = answers[i] === q.answer;
              return (
                <div key={i} className={`p-3 rounded-xl border text-xs ${isCorrect ? 'border-green-100 bg-green-50/20' : 'border-red-100 bg-red-50/20'}`}>
                  <p className="font-bold text-[var(--text-primary)]">{i + 1}. {q.question}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                    Jawaban Anda: <span className={isCorrect ? 'text-green-700 font-bold' : 'text-red-500 line-through'}>{answers[i] || '(kosong)'}</span>
                  </p>
                  {!isCorrect && (
                    <p className="text-[11px] text-green-700 font-bold mt-0.5">Kunci Jawaban: {q.answer}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reset button */}
          <button 
            onClick={generateQuiz} 
            className="w-full py-2.5 bg-[var(--surface-2)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Ulangi Latihan
          </button>
        </div>
      )}
    </div>
  );
}
