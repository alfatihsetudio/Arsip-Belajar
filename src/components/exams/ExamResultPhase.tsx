'use client';

import { Question } from './ExamActivePhase';

interface ExamResultPhaseProps {
  questions: Question[];
  answers: Record<number, string>;
  onFinish: () => void;
}

export default function ExamResultPhase({
  questions,
  answers,
  onFinish,
}: ExamResultPhaseProps) {
  let correctCount = 0;
  const incorrectQuestions: Question[] = [];

  questions.forEach((q, i) => {
    if (answers[i] === q.answer) {
      correctCount++;
    } else {
      incorrectQuestions.push(q);
    }
  });

  const pct = Math.round((correctCount / questions.length) * 100);
  const strokeDasharray = 283; // 2 * pi * r (r=45)
  const strokeDashoffset = strokeDasharray - (pct / 100) * strokeDasharray;
  
  const getScoreColor = () => {
    if (pct >= 80) return 'text-emerald-500';
    if (pct >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };
  
  const getScoreStroke = () => {
    if (pct >= 80) return 'stroke-emerald-500';
    if (pct >= 60) return 'stroke-amber-500';
    return 'stroke-rose-500';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* 1. Score Dashboard Container */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 flex flex-col md:flex-row items-center gap-10 shadow-sm relative overflow-hidden transition-colors">
        
        {/* Subtle Glow Effect for high scores */}
        {pct >= 80 && (
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
        )}
        
        {/* Circular Progress */}
        <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              className="text-[var(--border)] stroke-current"
              strokeWidth="8"
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
            />
            {/* Progress Circle */}
            <circle
              className={`${getScoreStroke()} transition-all duration-1000 ease-out`}
              strokeWidth="8"
              strokeLinecap="round"
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold tracking-tighter ${getScoreColor()}`}>
              {pct}%
            </span>
          </div>
        </div>

        {/* Score Text & Action */}
        <div className="text-center md:text-left space-y-4 z-10 flex-1">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
              {pct >= 80 ? 'Luar Biasa! 🎉' : pct >= 60 ? 'Kerja Bagus! 👍' : 'Jangan Menyerah! 💪'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md">
              Anda berhasil menjawab <strong className="text-[var(--text-primary)] font-semibold">{correctCount}</strong> dari <strong className="text-[var(--text-primary)] font-semibold">{questions.length}</strong> pertanyaan dengan benar.
              {pct < 100 && ' Tinjau kembali materi yang salah di bawah ini.'}
            </p>
          </div>
          
          <div className="flex justify-center md:justify-start pt-2">
            <button
              onClick={onFinish}
              className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold tracking-tight shadow-md hover:scale-[1.02] transition-all"
            >
              Selesai & Kembali
            </button>
          </div>
        </div>
      </div>

      {/* 2. Review Tab (Question List) */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)] px-1">
          Review Jawaban
        </h3>
        
        <div className="space-y-5">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.answer;
            
            return (
              <div 
                key={i} 
                className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm transition-colors"
              >
                <div className="space-y-5">
                  
                  {/* Inline Icon & Question Text */}
                  <div className="flex items-start gap-3.5">
                    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm ${
                      isCorrect 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400' 
                        : 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-400'
                    }`}>
                      {isCorrect ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      )}
                    </div>
                    <p className="text-[15px] sm:text-base font-semibold text-[var(--text-primary)] leading-relaxed tracking-tight">
                      {q.question}
                    </p>
                  </div>
                  
                  {/* Answer Boxes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-9">
                    
                    {/* User Answer Box */}
                    <div className={`p-4 rounded-xl border flex flex-col justify-center bg-transparent ${
                      isCorrect 
                        ? 'border-emerald-500'
                        : 'border-rose-500'
                    }`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-80 ${
                        isCorrect ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        Jawaban Anda
                      </span>
                      <p className={`text-sm font-medium leading-snug text-[var(--text-primary)] ${
                        !isCorrect ? 'line-through opacity-80' : ''
                      }`}>
                        {answers[i] || '(kosong)'}
                      </p>
                    </div>
                    
                    {/* Correct Key Box (Only show if incorrect) */}
                    {!isCorrect && (
                      <div className="bg-transparent border border-emerald-500 p-4 rounded-xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5 opacity-80">
                          Kunci Jawaban
                        </span>
                        <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                          {q.answer}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI Explanation Box */}
                  <div className="ml-9 mt-4 bg-transparent border border-sky-400 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-sky-500 tracking-wider uppercase">
                      <span className="text-sm drop-shadow-sm">✨</span>
                      Penjelasan AI
                    </div>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                      Fitur penjelasan cerdas dari Gemini AI akan segera hadir untuk menjelaskan mengapa jawaban ini benar berdasarkan materi Anda.
                    </p>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
