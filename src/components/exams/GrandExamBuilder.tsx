'use client';

import { useState } from 'react';
import ExamSetupPhase, { Note } from './ExamSetupPhase';
import ExamActivePhase, { Question } from './ExamActivePhase';
import ExamResultPhase from './ExamResultPhase';
import { saveExamResult } from '@/app/actions/exam';

export default function GrandExamBuilder({ 
  notes, 
  folders, 
  tags, 
  initialResults 
}: { 
  notes: Note[], 
  folders: any[], 
  tags: any[], 
  initialResults: any[] 
}) {
  const [phase, setPhase] = useState<'SETUP' | 'ACTIVE' | 'RESULT'>('SETUP');
  
  // Real results from DB
  const [examResults, setExamResults] = useState(initialResults || []);
  
  // Setup State
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('sedang');
  const [count, setCount] = useState(10);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [topicSummary, setTopicSummary] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  
  // Loading & Error
  const [loading, setLoading] = useState(false);
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

  const handleGenerate = async () => {
    if (selectedNotes.length === 0) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteIds: selectedNotes,
          count,
          difficulty,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate exam');
      
      setQuestions(data.questions);
      setTopicSummary(data.topicSummary || 'Beragam Materi');
      setAnswers({});
      setStartTime(Date.now());
      setPhase('ACTIVE');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleCancelOngoing = () => {
    setQuestions([]);
    setAnswers({});
    setPhase('SETUP');
  };

  const handleExamSubmit = async () => {
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
    // Calculate score
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.answer) correctCount++;
    });
    
    const pct = Math.round((correctCount / questions.length) * 100);
    const title = `Grand Exam: ${questions.length} Soal (${difficulty})`;
    
    try {
      await saveExamResult({
        title,
        score: pct,
        totalQuestions: questions.length,
        difficulty,
        durationSeconds,
        topics: topicSummary,
        correctAnswers: correctCount,
      });
      
      // Update local state optimistic UI
      setExamResults(prev => [{
        id: Math.random().toString(), // temporary ID
        title,
        score: pct,
        total_questions: questions.length,
        difficulty,
        duration_seconds: durationSeconds,
        topics: topicSummary,
        correct_answers: correctCount,
        created_at: new Date().toISOString()
      }, ...prev]);
    } catch (err) {
      console.error(err);
    }
    
    setPhase('RESULT');
  };

  const hasOngoingExam = questions.length > 0 && Object.keys(answers).length < questions.length;

  return (
    <div className="w-full">
      {phase === 'SETUP' && (
        <ExamSetupPhase 
          notes={notes}
          folders={folders}
          tags={tags}
          examResults={examResults}
          selectedNotes={selectedNotes}
          setSelectedNotes={setSelectedNotes}
          toggleNote={toggleNote}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          count={count}
          setCount={setCount}
          loading={loading}
          onGenerate={handleGenerate}
          error={error}
          hasOngoingExam={hasOngoingExam}
          onResume={() => setPhase('ACTIVE')}
          onCancelOngoing={handleCancelOngoing}
        />
      )}

      {phase === 'ACTIVE' && (
        <ExamActivePhase 
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          onCancel={() => setPhase('SETUP')}
          onSubmit={handleExamSubmit}
        />
      )}

      {phase === 'RESULT' && (
        <ExamResultPhase 
          questions={questions}
          answers={answers}
          onFinish={() => {
            setQuestions([]);
            setAnswers({});
            setPhase('SETUP');
          }}
        />
      )}
    </div>
  );
}
