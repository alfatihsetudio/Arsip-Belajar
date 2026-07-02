'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Saya asisten belajarmu di Arsip Belajar. Ada konsep pelajaran atau materi yang ingin kamu tanyakan hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 1 || loading) {
      scrollToBottom();
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim pesan');

      const aiMessage: Message = { role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan: ' + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-none">Asisten Belajar AI</h1>
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1">Siap menjawab semua pertanyaan belajarmu</p>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
        {messages.map((msg, index) => (
          <div 
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div 
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)] rounded-tr-none shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)] rounded-tl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] rounded-2xl rounded-tl-none px-4 py-3 text-xs sm:text-sm flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span>AI sedang mengetik...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && !loading && (
        <div className="flex flex-wrap gap-2 px-5 py-3 border-t border-[var(--border)] flex-shrink-0 bg-[var(--surface)]">
          <button
            onClick={() => handleChipClick('Bagaimana cara mengatur waktu belajar yang efektif?')}
            className="text-[10px] sm:text-xs bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/45 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-900/30 transition-all font-medium cursor-pointer"
          >
            💡 Belajar Efektif
          </button>
          <button
            onClick={() => handleChipClick('Tolong jelaskan perbedaan sel hewan dan sel tumbuhan.')}
            className="text-[10px] sm:text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/45 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/30 transition-all font-medium cursor-pointer"
          >
            🔬 Biologi: Sel
          </button>
          <button
            onClick={() => handleChipClick('Berikan rumus dasar fisika tentang gerak lurus berubah beraturan (GLBB).')}
            className="text-[10px] sm:text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/45 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-900/30 transition-all font-medium cursor-pointer"
          >
            📐 Fisika: GLBB
          </button>
        </div>
      )}

      {/* Input Box */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            handleSendMessage(input); 
          }}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Tanyakan materi pelajaran..."
            disabled={loading}
            className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
