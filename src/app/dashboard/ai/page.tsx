'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  transcribed_text: string;
  folder_id: string | null;
  folder?: { id: string; name: string } | null;
}

interface Folder {
  id: string;
  name: string;
}

export default function AIChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [attachedNote, setAttachedNote] = useState<Note | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNewChat, setIsNewChat] = useState(true);
  const [noteSearch, setNoteSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/ai/sessions');
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch (e) {
      console.error('Failed to load sessions', e);
    }
  };

  const selectSession = async (id: string) => {
    setCurrentSessionId(id);
    setIsNewChat(false);
    setSidebarOpen(false);
    setMessages([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/sessions/${id}`);
      const data = await res.json();
      setMessages(data.messages?.length > 0 ? data.messages : [{ role: 'assistant', content: 'Halo! Ada yang bisa saya bantu?' }]);
    } catch (e) {
      console.error('Failed to load session details', e);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setAttachedNote(null);
    setSidebarOpen(false);
    setIsNewChat(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/sessions/${id}`, { method: 'DELETE' });
      if (currentSessionId === id) createNewChat();
      loadSessions();
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const fetchNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: notesData }, { data: foldersData }] = await Promise.all([
      supabase
        .from('notes')
        .select('id, title, transcribed_text, folder_id, folder:folders(id, name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('folders')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')
    ]);
    if (notesData) setNotes(notesData as Note[]);
    // Smart-parse: folder name might be a JSON string (legacy) or a plain string (new)
    if (foldersData) {
      setFolders(foldersData.map((f: any) => {
        let name = f.name;
        if (typeof name === 'string' && name.trim().startsWith('{')) {
          try { name = JSON.parse(name).name; } catch { /* fallback below */ }
        }
        return { id: String(f.id), name: String(name ?? f.id) };
      }));
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    let finalPayload = textToSend;
    if (attachedNote) {
      finalPayload = `[Referensi Catatan: "${attachedNote.title}"]\n${attachedNote.transcribed_text || 'Tidak ada teks'}\n\nPertanyaan: ${textToSend}`;
      setAttachedNote(null);
    }

    setIsNewChat(false);
    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let activeSessionId = currentSessionId;
      if (!activeSessionId) {
        const titleRes = await fetch('/api/ai/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: textToSend.slice(0, 40) + (textToSend.length > 40 ? '...' : '') })
        });
        const titleData = await titleRes.json();
        if (titleData.session) {
          activeSessionId = titleData.session.id;
          setCurrentSessionId(activeSessionId);
          setSessions(prev => [titleData.session, ...prev]);
        }
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalPayload, history: messages, sessionId: activeSessionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim pesan');
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan: ' + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('id-ID', { weekday: 'short' });
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const suggestions = [
    { icon: '💡', label: 'Tips Belajar', text: 'Bagaimana cara belajar yang efektif dan tidak mudah lupa?' },
    { icon: '🧠', label: 'Bikin Rangkuman', text: 'Bagaimana cara membuat catatan yang efektif?' },
    { icon: '❓', label: 'Tanya Materi', text: 'Jelaskan konsep fotosintesis dengan mudah dipahami.' },
    { icon: '📝', label: 'Latihan Soal', text: 'Berikan contoh soal matematika tentang persamaan linear.' },
  ];

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[var(--surface)]">

      {/* ─── Sidebar Overlay (mobile) ─── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 flex flex-col
        w-52 bg-[var(--surface-2)] border-r border-[var(--border)]
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar top */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--border)]">
          <span className="font-semibold text-xs text-[var(--text-primary)] flex-1">Obrolan</span>
          <button
            onClick={createNewChat}
            title="Chat Baru"
            className="w-6 h-6 rounded-md hover:bg-[var(--border)] transition-colors flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden w-6 h-6 rounded-md hover:bg-[var(--border)] transition-colors flex items-center justify-center text-[var(--text-muted)]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-1.5 px-1.5 scrollbar-thin space-y-0.5">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <p className="text-[10px] text-[var(--text-muted)] text-center">Belum ada riwayat.<br/>Mulai chat baru!</p>
            </div>
          ) : (
            sessions.map(s => (
              <button
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={`group w-full flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  currentSessionId === s.id
                    ? 'bg-[var(--surface)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="flex-1 truncate text-[11px] font-medium">{s.title}</span>
                <span className="text-[9px] text-[var(--text-muted)] flex-shrink-0 group-hover:hidden">{formatTime(s.created_at)}</span>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="hidden group-hover:flex w-4 h-4 rounded items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ─── Main Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] flex-1 leading-none">Asisten Belajar AI</p>
          <button
            onClick={createNewChat}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Baru
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>
        </div>

        {/* ─── Chat body ─── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isNewChat && messages.length === 0 ? (
            /* ── Welcome / Empty State ── */
            <div className="h-full flex flex-col items-center justify-center px-6 pb-8 gap-8">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto shadow-lg">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Halo, ada yang bisa saya bantu?</h2>
                <p className="text-sm text-[var(--text-muted)] max-w-xs">Tanyakan apa saja seputar pelajaran, atau lampirkan catatan untuk analisis mendalam.</p>
              </div>

              {/* Suggestion chips */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(s.text)}
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] text-left transition-all group"
                  >
                    <span className="text-base leading-none mt-0.5">{s.icon}</span>
                    <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors leading-snug">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Messages ── */
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] rounded-br-sm whitespace-pre-wrap'
                      : 'bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)] rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          code: ({ children }) => <code className="bg-black/20 rounded px-1 font-mono text-[11px]">{children}</code>,
                          pre: ({ children }) => <pre className="bg-black/20 rounded-lg p-2 overflow-x-auto font-mono text-[11px] mb-2">{children}</pre>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ─── Input Area ─── */}
        <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          {/* Attached note chip */}
          {attachedNote && (
            <div className="mb-1.5">
              <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                <span className="max-w-[120px] truncate">{attachedNote.title}</span>
                <button onClick={() => setAttachedNote(null)} className="hover:text-red-400">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}>
            <div className="flex items-center gap-1.5 max-w-3xl mx-auto bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2 py-1.5 focus-within:border-[var(--accent)] transition-colors">
              {/* Attach button */}
              <button
                type="button"
                onClick={() => { fetchNotes(); setShowNoteModal(true); }}
                disabled={loading}
                title="Lampirkan Catatan"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors flex-shrink-0 disabled:opacity-40"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>

              {/* Input */}
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(input);
                  }
                }}
                placeholder="Tanyakan materi pelajaran..."
                disabled={loading}
                className="flex-1 bg-transparent py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />

              {/* Send button */}
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-7 h-7 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 cursor-pointer flex-shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
            <p className="text-center text-[9px] text-[var(--text-muted)] mt-1">AI dapat membuat kesalahan. Verifikasi informasi penting.</p>
          </form>
        </div>
      </div>

      {/* ─── Attach Note Modal ─── */}
      {showNoteModal && (() => {
        const q = noteSearch.toLowerCase();
        const filtered = notes.filter(n => {
          const matchFolder = selectedFolder === null || n.folder_id === selectedFolder;
          const matchSearch = !q || n.title.toLowerCase().includes(q) || (n.transcribed_text || '').toLowerCase().includes(q);
          return matchFolder && matchSearch;
        });
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowNoteModal(false); setNoteSearch(''); setSelectedFolder(null); }} />
            <div className="relative bg-[var(--surface)] border border-[var(--border)] w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[80vh] z-50 overflow-hidden animate-fadeIn">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">Pilih Catatan</h3>
                <button onClick={() => { setShowNoteModal(false); setNoteSearch(''); setSelectedFolder(null); }} className="w-7 h-7 rounded-lg hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Search bar */}
              <div className="px-3 pt-3 pb-1">
                <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-1.5 focus-within:border-[var(--accent)] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)] flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    value={noteSearch}
                    onChange={e => setNoteSearch(e.target.value)}
                    placeholder="Cari judul atau isi catatan..."
                    autoFocus
                    className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  />
                  {noteSearch && (
                    <button onClick={() => setNoteSearch('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Folder filter tabs */}
              {folders.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                      selectedFolder === null
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Semua
                  </button>
                  {folders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFolder(selectedFolder === f.id ? null : f.id)}
                      className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                        selectedFolder === f.id
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                          : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Note list */}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {filtered.length === 0 ? (
                  <div className="text-center py-10 text-xs text-[var(--text-muted)]">
                    {noteSearch ? `Tidak ada catatan untuk "${noteSearch}"` : 'Belum ada catatan.'}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filtered.map(note => (
                      <button
                        key={note.id}
                        onClick={() => { setAttachedNote(note); setShowNoteModal(false); setNoteSearch(''); setSelectedFolder(null); }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors"
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {note.folder?.name && (() => {
                            let displayName = note.folder.name;
                            if (displayName.startsWith('{')) {
                              try { displayName = JSON.parse(displayName).name; } catch {}
                            }
                            return (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)] flex-shrink-0">
                                {displayName}
                              </span>
                            );
                          })()}
                          <p className="font-medium text-xs text-[var(--text-primary)] truncate">{note.title}</p>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">{note.transcribed_text || 'Tidak ada teks...'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
