'use client';

import { useState } from 'react';

export interface Note {
  id: string;
  title: string;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  notes: { id: string }[];
}

export interface Tag {
  id: string;
  name: string;
  note_tags: { note_id: string }[];
}

interface ExamSetupPhaseProps {
  notes: Note[];
  folders?: Folder[];
  tags?: Tag[];
  examResults: any[];
  selectedNotes: string[];
  setSelectedNotes: React.Dispatch<React.SetStateAction<string[]>>;
  toggleNote: (id: string) => void;
  difficulty: string;
  setDifficulty: (diff: string) => void;
  count: number;
  setCount: (count: number) => void;
  loading: boolean;
  onGenerate: () => void;
  error: string;
  hasOngoingExam: boolean;
  onResume: () => void;
  onCancelOngoing: () => void;
}

export default function ExamSetupPhase({
  notes,
  folders = [],
  tags = [],
  examResults,
  selectedNotes,
  setSelectedNotes,
  toggleNote,
  difficulty,
  setDifficulty,
  count,
  setCount,
  loading,
  onGenerate,
  error,
  hasOngoingExam,
  onResume,
  onCancelOngoing,
}: ExamSetupPhaseProps) {
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isCountOpen, setIsCountOpen] = useState(false);
  const [selectionType, setSelectionType] = useState<'notes' | 'folders' | 'tags'>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Full-screen Archive State
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveDate, setArchiveDate] = useState('');
  const [archiveDifficulty, setArchiveDifficulty] = useState('Semua');
  const [isArchiveDiffOpen, setIsArchiveDiffOpen] = useState(false);
  
  // Custom Calendar States
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarView, setCalendarView] = useState(() => new Date());

  const filteredExamResults = examResults.filter(exam => {
    const matchSearch = (exam.topics || 'Beragam Materi').toLowerCase().includes(archiveSearch.toLowerCase());
    const matchDiff = archiveDifficulty === 'Semua' || exam.difficulty.toLowerCase() === archiveDifficulty.toLowerCase();
    const matchDate = !archiveDate || new Date(exam.created_at).toISOString().split('T')[0] === archiveDate;
    return matchSearch && matchDiff && matchDate;
  });

  // Calculate Real Stats from examResults
  const totalExams = examResults.length;
  const averageScore = totalExams > 0 
    ? Math.round(examResults.reduce((acc, curr) => acc + curr.score, 0) / totalExams) 
    : 0;
  
  const totalQuestions = examResults.reduce((acc, curr) => acc + curr.total_questions, 0);
  const totalCorrect = examResults.reduce((acc, curr) => acc + Math.round((curr.score / 100) * curr.total_questions), 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  
  // Fake trend/material data for now, as tags aren't implemented in the backend yet
  const strongestMaterial = totalExams > 0 ? 'Beragam' : 'Belum Tersedia';

  const stats = [
    { label: 'Akurasi Keseluruhan', value: `${overallAccuracy}%`, trend: 'Semua ujian', color: 'text-indigo-500' },
    { label: 'Rata-rata Nilai', value: `${averageScore}/100`, trend: 'Dari riwayat', color: 'text-emerald-500' },
    { label: 'Ujian Diselesaikan', value: `${totalExams}`, trend: 'Total riwayat', color: 'text-blue-500' },
    { label: 'Materi Terkuat', value: strongestMaterial, trend: 'Tingkatkan terus!', color: 'text-amber-500' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  const formatDuration = (seconds: number) => {
    if (!seconds && seconds !== 0) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const renderArchiveTable = (data: any[], expanded: boolean = false) => (
    <div className="flex-1 overflow-x-auto">
      <table className={`w-full text-left ${expanded ? 'min-w-[800px]' : 'min-w-[550px]'}`}>
        <thead>
          <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-normal">
            <th className="pb-3 px-2">Materi Ujian</th>
            <th className="pb-3 px-2">Kesulitan</th>
            <th className="pb-3 px-2 text-center">Soal</th>
            <th className="pb-3 px-2 text-center">Benar</th>
            <th className="pb-3 px-2 text-center">Skor</th>
            <th className="pb-3 px-2">Tanggal</th>
            <th className="pb-3 px-2 text-right">Durasi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)] font-normal">Belum ada riwayat ujian.</td>
            </tr>
          ) : data.map((exam) => (
            <tr key={exam.id} className="hover:bg-[var(--surface-2)] transition-colors group">
              <td className="py-2.5 px-2 text-sm font-normal text-[var(--text-primary)] tracking-tight truncate max-w-[150px]" title={exam.topics || 'Beragam Materi'}>{exam.topics || 'Beragam Materi'}</td>
              <td className="py-2.5 px-2 text-xs text-[var(--text-secondary)] capitalize">{exam.difficulty}</td>
              <td className="py-2.5 px-2 text-xs text-center text-[var(--text-secondary)]">{exam.total_questions}</td>
              <td className="py-2.5 px-2 text-xs text-center text-[var(--text-secondary)] font-normal">{exam.correct_answers || 0}</td>
              <td className="py-2.5 px-2 text-center font-normal text-sm tracking-tight text-[var(--text-primary)]">
                {exam.score}
              </td>
              <td className="py-2.5 px-2 text-xs text-[var(--text-secondary)]">
                {new Date(exam.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="py-2.5 px-2 text-right text-xs text-[var(--text-secondary)] font-normal">
                {formatDuration(exam.duration_seconds)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Custom Calendar Logic
  const currentMonth = calendarView.getMonth();
  const currentYear = calendarView.getFullYear();
  const daysCount = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDay = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const blanks = Array.from({ length: startDay }, (_, i) => i);
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  if (isArchiveExpanded) {
    return (
      <div className="w-full h-[85vh] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm flex flex-col overflow-hidden animate-fadeIn relative">
        {/* Header & Filters */}
        <div className="p-3 md:p-4 border-b border-[var(--border)] flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center justify-between bg-[var(--surface-2)]">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setIsArchiveExpanded(false)} className="w-7 h-7 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-3)] transition-colors group">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] leading-none mt-0.5">Semua Riwayat Ujian</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Cari materi..." 
              value={archiveSearch} 
              onChange={e => setArchiveSearch(e.target.value)} 
              className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--surface-3)] border border-[var(--border)] hover:border-indigo-500 focus:border-indigo-500 transition-colors outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full sm:w-[220px]" 
            />
            <div className="flex w-full sm:w-auto gap-2.5">
              <div className="relative flex-1 sm:w-auto min-w-[140px]">
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="w-full h-full flex items-center justify-between gap-2 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg font-medium text-[var(--text-primary)] text-xs transition-all hover:border-[var(--text-muted)] shadow-sm text-left tracking-tight"
                >
                  <span className={archiveDate ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                    {archiveDate ? new Date(archiveDate).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}) : 'dd / mm / yyyy'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)] shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </button>

                {isCalendarOpen && (
                  <div className="absolute top-full mt-1 left-0 w-[260px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 p-4 animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                      <button onClick={(e) => { e.stopPropagation(); setCalendarView(new Date(currentYear, currentMonth - 1, 1)); }} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      </button>
                      <span className="text-[12px] font-bold text-[var(--text-primary)] tracking-wide">
                        {monthNames[currentMonth]} {currentYear}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); setCalendarView(new Date(currentYear, currentMonth + 1, 1)); }} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                      {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((day, i) => (
                        <div key={i} className="text-[10px] font-bold text-[var(--text-muted)] p-1">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {blanks.map(b => <div key={`b-${b}`} className="p-1"></div>)}
                      {days.map(d => {
                        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const isSelected = archiveDate === dateStr;
                        return (
                          <button
                            key={d}
                            onClick={() => { setArchiveDate(dateStr); setIsCalendarOpen(false); }}
                            className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded-full mx-auto transition-colors ${isSelected ? 'bg-indigo-500 text-white shadow-md' : 'text-[var(--text-primary)] hover:bg-[var(--surface-2)]'}`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                    {archiveDate && (
                      <button 
                        onClick={() => { setArchiveDate(''); setIsCalendarOpen(false); }}
                        className="w-full mt-4 py-2 text-[10px] font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors uppercase tracking-wider"
                      >
                        Hapus Filter
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="relative flex-1 sm:w-auto min-w-[130px] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsArchiveDiffOpen(!isArchiveDiffOpen)}
                  className="w-full h-full flex items-center justify-between gap-2 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg font-medium text-[var(--text-primary)] text-xs transition-all hover:border-[var(--text-muted)] shadow-sm text-left tracking-tight"
                >
                  <span className="capitalize">{archiveDifficulty === 'Semua' ? 'Semua Kesulitan' : archiveDifficulty}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {isArchiveDiffOpen && (
                  <div className="absolute top-full mt-1 left-0 w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-40 py-1 text-xs animate-fadeIn">
                    {['Semua', 'mudah', 'sedang', 'sulit'].map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => { setArchiveDifficulty(diff); setIsArchiveDiffOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-[var(--surface-2)] transition-colors font-medium capitalize tracking-tight ${archiveDifficulty === diff ? 'text-indigo-500' : 'text-[var(--text-secondary)]'}`}
                      >
                        {diff === 'Semua' ? 'Semua Kesulitan' : diff}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Table Area */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[var(--bg)]">
           {renderArchiveTable(filteredExamResults, true)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0 w-full animate-fadeIn">
      
      {/* SECTION A: Performance Stats (col-span-12) */}
      <div className="lg:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">{stat.label}</span>
            <span className={`text-2xl font-bold tracking-tight ${stat.color} mb-1`}>{stat.value}</span>
            <span className="text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--surface-2)] inline-block w-fit px-2 py-0.5 rounded-md">{stat.trend}</span>
          </div>
        ))}
      </div>

      {/* SECTION B: Exam Archive (col-span-8) */}
      <div className="lg:col-span-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col h-full transition-colors">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-semibold text-[var(--text-primary)] tracking-tight text-sm">Riwayat Nilai (Exam Archive)</h2>
          <button onClick={() => setIsArchiveExpanded(true)} className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-600 uppercase tracking-wide">Lihat Semua</button>
        </div>
        
        {renderArchiveTable(examResults.slice(0, 6))}
      </div>

      {/* SECTION C: Exam Builder Card (col-span-4) */}
      <div className="lg:col-span-4 bg-gradient-to-b from-[var(--surface)] to-[var(--surface-2)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col relative overflow-hidden transition-colors">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />

        <div className="mb-4 relative z-10">
          <h2 className="font-semibold text-lg text-[var(--text-primary)] tracking-tight mb-1">Mulai Ujian Baru</h2>
          <p className="text-[11px] text-[var(--text-secondary)]">Uji pemahamanmu menggunakan AI.</p>
        </div>

        <div className="relative mb-4 shrink-0 z-10">
          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari ${selectionType}...`}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] outline-none focus:border-indigo-500 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors shadow-sm"
          />
        </div>

        {/* Mock Type Selector */}
        <div className="flex bg-[var(--surface-2)] border border-[var(--border)] p-1 rounded-xl mb-4 text-[10px] font-semibold relative z-10 shadow-sm">
          <button 
            className={`flex-1 py-1.5 rounded-lg transition-colors ${selectionType === 'notes' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            onClick={() => setSelectionType('notes')}
          >
            Notes
          </button>
          <button 
            className={`flex-1 py-1.5 rounded-lg transition-colors ${selectionType === 'folders' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            onClick={() => setSelectionType('folders')}
          >
            Folders
          </button>
          <button 
            className={`flex-1 py-1.5 rounded-lg transition-colors ${selectionType === 'tags' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            onClick={() => setSelectionType('tags')}
          >
            Tags
          </button>
        </div>

        {/* Note Selector List (Compacted) */}
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col min-h-[150px] max-h-[220px] relative z-10 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Pilih {selectionType}</span>
            <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
              {selectedNotes.length} / 10
            </span>
          </div>
          {selectionType === 'notes' && (
            notes.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[10px] text-[var(--text-muted)]">Belum ada catatan</div>
            ) : (
              <div className="overflow-y-auto pr-1 space-y-1 flex-1 custom-scrollbar">
                {notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase())).map((note) => {
                  const isChecked = selectedNotes.includes(note.id);
                  return (
                    <label
                      key={note.id}
                      className={`flex items-start gap-2 py-2 px-2 cursor-pointer transition-colors rounded-lg ${isChecked ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleNote(note.id)}
                        className="mt-0.5 accent-indigo-500 w-3 h-3 rounded-sm cursor-pointer shrink-0"
                      />
                      <span className={`text-xs font-medium leading-tight ${isChecked ? 'text-indigo-400' : 'text-[var(--text-primary)]'}`}>{note.title}</span>
                    </label>
                  );
                })}
                {notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="py-4 text-center text-[10px] text-[var(--text-muted)]">
                    Tidak ditemukan
                  </div>
                )}
              </div>
            )
          )}

          {selectionType === 'folders' && (
            folders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[10px] text-[var(--text-muted)]">Belum ada folder</div>
            ) : (
              <div className="overflow-y-auto pr-1 space-y-1 flex-1 custom-scrollbar">
                {folders.filter(f => {
                  let name = f.name;
                  try { name = JSON.parse(f.name).name || f.name; } catch {}
                  return name.toLowerCase().includes(searchQuery.toLowerCase());
                }).map((folder) => {
                  let folderName = folder.name;
                  try { folderName = JSON.parse(folder.name).name || folder.name; } catch {}
                  
                  const folderNoteIds = folder.notes.map(n => n.id);
                  const isChecked = selectedFolders.includes(folder.id);
                  
                  const handleFolderToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
                    if (isChecked) {
                      setSelectedFolders(prev => prev.filter(id => id !== folder.id));
                      setSelectedNotes(prev => prev.filter(id => !folderNoteIds.includes(id)));
                    } else {
                      setSelectedFolders(prev => [...prev, folder.id]);
                      setSelectedNotes(prev => {
                        const newSelection = [...prev];
                        for (const id of folderNoteIds) {
                          if (!newSelection.includes(id) && newSelection.length < 10) {
                            newSelection.push(id);
                          }
                        }
                        return newSelection;
                      });
                    }
                  };

                  return (
                    <label
                      key={folder.id}
                      className={`flex items-center justify-between gap-2 py-2 px-2 cursor-pointer transition-colors rounded-lg ${isChecked ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={handleFolderToggle}
                          className="accent-indigo-500 w-3 h-3 rounded-sm cursor-pointer shrink-0"
                        />
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500 shrink-0"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
                        <span className={`text-xs font-medium truncate ${isChecked ? 'text-indigo-400' : 'text-[var(--text-primary)]'}`}>{folderName}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">{folderNoteIds.length} catatan</span>
                    </label>
                  );
                })}
                {folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="py-4 text-center text-[10px] text-[var(--text-muted)]">
                    Tidak ditemukan
                  </div>
                )}
              </div>
            )
          )}

          {selectionType === 'tags' && (
            tags.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[10px] text-[var(--text-muted)]">Belum ada tag</div>
            ) : (
              <div className="overflow-y-auto pr-1 space-y-1 flex-1 custom-scrollbar">
                {tags.filter(t => {
                  let name = t.name;
                  try { name = JSON.parse(t.name).name || t.name; } catch {}
                  return name.toLowerCase().includes(searchQuery.toLowerCase());
                }).map((tag) => {
                  let tagName = tag.name;
                  try { tagName = JSON.parse(tag.name).name || tag.name; } catch {}
                  
                  const tagNoteIds = tag.note_tags.map(nt => nt.note_id);
                  const isChecked = selectedTags.includes(tag.id);
                  
                  const handleTagToggle = () => {
                    if (isChecked) {
                      setSelectedTags(prev => prev.filter(id => id !== tag.id));
                      setSelectedNotes(prev => prev.filter(id => !tagNoteIds.includes(id)));
                    } else {
                      setSelectedTags(prev => [...prev, tag.id]);
                      setSelectedNotes(prev => {
                        const newSelection = [...prev];
                        for (const id of tagNoteIds) {
                          if (!newSelection.includes(id) && newSelection.length < 10) {
                            newSelection.push(id);
                          }
                        }
                        return newSelection;
                      });
                    }
                  };

                  return (
                    <label
                      key={tag.id}
                      className={`flex items-center justify-between gap-2 py-2 px-2 cursor-pointer transition-colors rounded-lg ${isChecked ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={handleTagToggle}
                          className="accent-indigo-500 w-3 h-3 rounded-sm cursor-pointer shrink-0"
                        />
                        <span className="text-[10px] font-bold text-rose-500 shrink-0">#</span>
                        <span className={`text-xs font-medium truncate ${isChecked ? 'text-indigo-400' : 'text-[var(--text-primary)]'}`}>{tagName}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">{tagNoteIds.length} catatan</span>
                    </label>
                  );
                })}
                {tags.filter(t => {
                  let name = t.name;
                  try { name = JSON.parse(t.name).name || t.name; } catch {}
                  return name.toLowerCase().includes(searchQuery.toLowerCase());
                }).length === 0 && (
                  <div className="py-4 text-center text-[10px] text-[var(--text-muted)]">
                    Tidak ditemukan
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Configuration */}
        {hasOngoingExam ? (
          <div className="mt-4 pt-3 space-y-2 border-t border-[var(--border)] relative z-10">
            <p className="text-[10px] font-semibold text-amber-500 text-center uppercase tracking-wide">Ujian sedang berjalan</p>
            <button
              onClick={onResume}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-xs font-semibold shadow-sm hover:bg-amber-600 transition-colors"
            >
              Lanjutkan Ujian
            </button>
            <button
              onClick={onCancelOngoing}
              className="w-full py-2 rounded-xl border border-rose-500/30 text-rose-500 text-xs font-semibold hover:bg-rose-500/10 transition-colors"
            >
              Batalkan Ujian
            </button>
          </div>
        ) : (
          <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-3 relative z-10">
            {error && <div className="text-[10px] text-rose-500 font-medium bg-rose-500/10 border border-rose-500/30 p-2 rounded-lg">{error}</div>}
            
            <div className="flex gap-2 relative">
              {/* Difficulty Dropdown */}
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => { setIsDiffOpen(!isDiffOpen); setIsCountOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl font-medium text-[var(--text-primary)] text-[11px] transition-all hover:border-[var(--text-muted)] shadow-sm text-left tracking-tight"
                >
                  <span className="capitalize">{difficulty}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {isDiffOpen && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-40 py-1 text-[11px] animate-fadeIn">
                    {['mudah', 'sedang', 'sulit'].map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => { setDifficulty(diff); setIsDiffOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-[var(--surface-2)] transition-colors font-medium capitalize tracking-tight ${difficulty === diff ? 'text-indigo-500' : 'text-[var(--text-secondary)]'}`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Count Dropdown */}
              <div className="w-16 relative">
                <button
                  type="button"
                  onClick={() => { setIsCountOpen(!isCountOpen); setIsDiffOpen(false); }}
                  className="w-full flex items-center justify-between px-2 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl font-medium text-[var(--text-primary)] text-[11px] transition-all hover:border-[var(--text-muted)] shadow-sm text-left tracking-tight"
                >
                  <span>{count}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {isCountOpen && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-40 py-1 text-[11px] animate-fadeIn">
                    {[10, 20, 40].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => { setCount(num); setIsCountOpen(false); }}
                        className={`w-full text-left px-2 py-1.5 hover:bg-[var(--surface-2)] transition-colors font-medium tracking-tight ${count === num ? 'text-indigo-500' : 'text-[var(--text-secondary)]'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={loading || selectedNotes.length === 0}
              onClick={onGenerate}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-[11px] font-semibold tracking-tight shadow-md hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Mulai Grand Exam
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
