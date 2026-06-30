import { createClient } from '@/lib/supabase/server';

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', user!.id).single();
  const isPremium = profile?.is_premium ?? false;

  return (
    <div className="max-w-xl mx-auto animate-fadeIn">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Subscription</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-8">Unlock the full power of Arsip Belajar.</p>

      {isPremium ? (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center">
          <p className="text-2xl mb-2">⭐</p>
          <p className="font-bold text-amber-800">You are a Premium Member</p>
          <p className="text-sm text-amber-700 mt-1">Enjoy all features with no restrictions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Free Plan */}
          <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-[var(--text-primary)]">Free Plan</p>
              <span className="text-xs bg-[var(--surface-2)] text-[var(--text-secondary)] px-2.5 py-1 rounded-full font-medium">Current</span>
            </div>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              {['Unlimited image uploads', 'AI text extraction (OCR)', 'Full-text search', 'Quick Exam (5 questions)'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {f}
                </li>
              ))}
              {['Audio transcription', 'Grand Exam (20 questions)', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-[var(--text-muted)] line-through">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Premium Plan */}
          <div className="p-5 bg-[var(--accent)] text-[var(--accent-fg)] rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-lg">Premium Plan</p>
              <span className="text-xs bg-amber-400 text-amber-900 px-2.5 py-1 rounded-full font-bold">⭐ BEST VALUE</span>
            </div>
            <p className="text-3xl font-bold mt-2 mb-0.5">$5 <span className="text-base font-normal opacity-70">/ month</span></p>
            <p className="text-sm opacity-70 mb-5">Everything in Free, plus:</p>
            <ul className="space-y-2 text-sm mb-6">
              {['Audio recording transcription', 'Grand Exam (20 MCQs from up to 10 notes)', 'Priority AI processing', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <button disabled className="w-full py-3 rounded-xl bg-white/20 font-semibold text-sm cursor-not-allowed opacity-70">
              Coming Soon
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
