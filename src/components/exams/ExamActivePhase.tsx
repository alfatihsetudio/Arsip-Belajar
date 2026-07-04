'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface Question {
  question: string;
  options: string[];
  answer: string;
}

interface ExamActivePhaseProps {
  questions: Question[];
  answers: Record<number, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function ExamActivePhase({
  questions,
  answers,
  setAnswers,
  onCancel,
  onSubmit,
}: ExamActivePhaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Initialize selected option if already answered (in case they navigated back, though there's no back button in zen mode)
  useEffect(() => {
    setSelectedOption(answers[currentIndex] || null);
  }, [currentIndex, answers]);

  const handleSelect = (opt: string) => {
    if (selectedOption !== null) return; // Prevent double clicking during transition

    setSelectedOption(opt);
    setAnswers((prev) => ({ ...prev, [currentIndex]: opt }));

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption(null);
      } else {
        onSubmit();
      }
    }, 600);
  };

  const currentQ = questions[currentIndex];
  const progressPct = ((currentIndex) / questions.length) * 100;

  // Prevent background scrolling while in Zen Mode
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!currentQ) return null;

  const zenModeContent = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950 text-slate-200 overflow-hidden font-sans w-full h-full">
      {/* Ambient Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[60%] -right-[10%] w-[60vw] h-[60vw] bg-blue-700/10 rounded-full blur-[140px] mix-blend-screen" />
        <div className="absolute top-[20%] left-[40%] w-[40vw] h-[40vw] bg-purple-600/5 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* Minimal Progress Bar at Absolute Top */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5 z-20">
        <div 
          className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all duration-500 ease-out" 
          style={{ width: `${progressPct}%` }} 
        />
      </div>

      {/* Discreet Cancel Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2 opacity-50 hover:opacity-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          Kembali ke Dashboard
        </button>
      </div>

      {/* Centered Question Container */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 w-full max-w-3xl mx-auto">
        <div className="w-full space-y-10 animate-fadeIn">
          {/* Question Text */}
          <div className="space-y-4">
            <span className="text-xs font-bold tracking-widest text-indigo-400/80 uppercase">
              Pertanyaan {currentIndex + 1} dari {questions.length}
            </span>
            <h2 className="text-2xl md:text-3xl font-medium leading-relaxed text-slate-100">
              {currentQ.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3 w-full">
            {currentQ.options.map((opt) => {
              const isSelected = selectedOption === opt;
              const isOtherSelected = selectedOption !== null && selectedOption !== opt;
              
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  disabled={selectedOption !== null}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 group ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.02] z-10'
                      : isOtherSelected
                      ? 'border-white/5 opacity-30 scale-[0.98]'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5 cursor-pointer hover:scale-[1.01]'
                  }`}
                >
                  {/* Custom Radio Circle */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    isSelected ? 'border-indigo-400' : 'border-slate-600 group-hover:border-slate-400'
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-scaleIn" />}
                  </div>
                  
                  <span className={`text-base md:text-lg ${isSelected ? 'text-indigo-100 font-medium' : 'text-slate-300'}`}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(zenModeContent, document.body) : null;
}
