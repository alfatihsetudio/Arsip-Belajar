import LoginButton from '@/components/auth/LoginButton';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Welcome',
  description: 'Sign in to ArsipBelajar – your AI-powered personal study archive.',
};

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg)]">
      <div className="w-full max-w-sm text-center space-y-8 animate-fadeIn">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Arsip Belajar</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Your personal AI study archive</p>
          </div>
        </div>

        {/* Feature List */}
        <div className="text-left space-y-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
          {[
            { icon: "📷", text: "Upload photos of your notes or whiteboard" },
            { icon: "🤖", text: "AI extracts & deduplicates text automatically" },
            { icon: "📝", text: "Organized in Markdown, searchable anytime" },
            { icon: "🎯", text: "Auto-generate quizzes and mock exams" },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3 text-sm">
              <span className="text-base mt-0.5">{item.icon}</span>
              <span className="text-[var(--text-secondary)]">{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <LoginButton />
          <p className="text-xs text-[var(--text-muted)]">
            Free to use. No credit card required.
          </p>
        </div>
      </div>
    </main>
  );
}
