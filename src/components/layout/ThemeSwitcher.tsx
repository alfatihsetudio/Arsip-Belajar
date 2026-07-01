'use client';

import { useState, useEffect } from 'react';

export default function ThemeSwitcher() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read initial theme preference from document class
    const root = document.documentElement;
    setIsDark(root.classList.contains('dark'));
  }, []);

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const x = e.clientX;
    const y = e.clientY;

    // Create wave ripple element
    const ripple = document.createElement('div');
    ripple.className = 'theme-ripple';
    
    // Set style and color based on next theme
    const nextDark = !isDark;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = '120vmax';
    ripple.style.height = '120vmax';
    ripple.style.backgroundColor = nextDark ? '#09090b' : '#f4f4f5';
    
    document.body.appendChild(ripple);

    // Trigger animation
    requestAnimationFrame(() => {
      ripple.classList.add('active');
    });

    // Toggle theme state and class name mid-animation
    setTimeout(() => {
      if (nextDark) {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      setIsDark(nextDark);
    }, 450);

    // Clean up DOM element
    setTimeout(() => {
      ripple.remove();
    }, 900);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-all cursor-pointer flex items-center justify-center text-[var(--text-secondary)] active:scale-95 hover:text-[var(--text-primary)] shadow-sm"
      title="Ubah Tema"
    >
      {isDark ? (
        // Sun Icon
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      ) : (
        // Moon Icon
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      )}
    </button>
  );
}
