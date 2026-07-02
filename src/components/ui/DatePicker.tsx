import React, { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, onClear, placeholder = 'Tanggal' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Date currently shown in the calendar view
  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const yyyy = viewDate.getFullYear();
    const mm = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const displayDate = value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="relative flex-shrink-0" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg font-bold text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-all cursor-pointer text-[10px] sm:text-[11px] min-h-[28px] flex items-center gap-1 justify-between min-w-[90px] select-none"
      >
        <span>
          {value ? `📅 ${displayDate}` : `📅 ${placeholder}`}
        </span>
        {value ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="hover:text-red-500 transition-colors ml-1 z-10 relative flex items-center justify-center text-[var(--text-secondary)]"
            title="Hapus Filter"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </div>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform flex-shrink-0 text-[var(--text-secondary)]"><path d="m6 9 6 6 6-6"/></svg>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
          <div 
            className="absolute inset-0" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-4 w-full max-w-[280px] sm:max-w-xs animate-scaleIn select-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={handlePrevMonth} type="button" className="p-1.5 hover:bg-[var(--surface-2)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="font-extrabold text-base text-[var(--text-primary)]">
                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
              </div>
              <button onClick={handleNextMonth} type="button" className="p-1.5 hover:bg-[var(--surface-2)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-[var(--text-muted)] py-1 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {blanks.map(blank => (
                <div key={`blank-${blank}`} className="p-1" />
              ))}
              {days.map(day => {
                const yyyy = viewDate.getFullYear();
                const mm = String(viewDate.getMonth() + 1).padStart(2, '0');
                const dd = String(day).padStart(2, '0');
                const currentItemDate = `${yyyy}-${mm}-${dd}`;
                const isSelected = currentItemDate === value;
                const isToday = currentItemDate === new Date().toLocaleDateString('en-CA');

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`
                      w-full aspect-square flex items-center justify-center text-sm rounded-xl transition-all font-semibold
                      ${isSelected 
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-md transform scale-105' 
                        : isToday
                          ? 'bg-[var(--surface-2)] text-[var(--text-primary)] border-2 border-[var(--accent)]'
                          : 'text-[var(--text-primary)] hover:bg-[var(--surface-2)] hover:scale-110'
                      }
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            
            <button 
              type="button" 
              onClick={() => setIsOpen(false)} 
              className="mt-4 w-full py-2 bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-primary)] rounded-xl font-bold text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
