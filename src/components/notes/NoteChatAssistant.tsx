'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function NoteChatAssistant({ noteId, isGuest = false }: { noteId: string; isGuest?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Saya asisten belajarmu. Tanyakan apa saja mengenai materi catatan ini.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll if there is active chat activity (more than the initial greeting message) or if AI is loading a reply
    if (messages.length > 1 || loading) {
      scrollToBottom();
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (isGuest) {
      window.location.href = '/';
      return;
    }
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/note/${noteId}/chat`, {
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
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex flex-col h-[380px] w-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 flex-shrink-0">
        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h2 className="text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">
          Tanya Catatan (AI)
        </h2>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-left scrollbar-thin">
        {messages.map((msg, index) => (
          <div 
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)] rounded-tr-none'
                  : 'bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)] rounded-tl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] rounded-2xl rounded-tl-none px-3 py-2.5 text-xs flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span>AI berpikir...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && !loading && (
        <div className="flex flex-wrap gap-1.5 py-2 border-t border-[var(--border)] flex-shrink-0 justify-start">
          <button
            onClick={() => handleChipClick('Rangkum isi catatan ini secara singkat.')}
            className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200 transition-colors font-medium cursor-pointer"
          >
            📝 Rangkum Catatan
          </button>
          <button
            onClick={() => handleChipClick('Tuliskan 3 soal latihan berdasarkan catatan ini beserta jawabannya.')}
            className="text-[10px] bg-amber-50 text-amber-700 hover:bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 transition-colors font-medium cursor-pointer"
          >
            ❓ Buat Soal Latihan
          </button>
        </div>
      )}

      {/* Input Box */}
      <form 
        onSubmit={(e) => { 
          e.preventDefault(); 
          if (isGuest) {
            window.location.href = '/';
            return;
          }
          handleSendMessage(input); 
        }}
        className="flex items-center gap-2 border-t border-[var(--border)] pt-2 flex-shrink-0"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onClick={() => {
            if (isGuest) {
              window.location.href = '/';
            }
          }}
          placeholder={isGuest ? "Masuk untuk bertanya..." : "Tanyakan materi..."}
          disabled={loading}
          className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)] transition-all"
        />
        <button
          type="submit"
          disabled={loading || (!isGuest && !input.trim())}
          className="w-8 h-8 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>
  );
}
