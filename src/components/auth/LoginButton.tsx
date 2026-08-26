'use client';

import { useState, useEffect } from 'react';
import { SignInButton, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function LoginButton({ redirectAfter }: { redirectAfter?: string }) {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const ua = typeof window !== 'undefined' ? (navigator.userAgent || '') : '';
    const isWebView = /FBAN|FBAV|Instagram|Twitter|Line|WhatsApp|WhatsApp|Telegram|FBDV|Process\/[0-9a-fA-F]+/i.test(ua);
    setIsInAppBrowser(isWebView);
  }, []);

  // Jika user sudah login, redirect langsung ke dashboard tanpa membuka modal
  const handleClickWhenSignedIn = () => {
    router.push(redirectAfter || '/dashboard');
  };

  const buttonContent = (
    <>
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {isSignedIn ? 'Buka Dashboard' : 'Continue with Google or Email'}
    </>
  );

  return (
    <div className="w-full">
      {isInAppBrowser && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl p-3 text-xs text-left mb-4 leading-relaxed">
          ⚠️ <strong>Peringatan WhatsApp/Telegram/IG:</strong> Autentikasi bisa dibatasi di dalam aplikasi pihak ketiga. Jika tombol tidak berfungsi, harap klik menu titik tiga di pojok kanan atas lalu pilih <strong>&quot;Buka di Browser Utama&quot;</strong> (Chrome/Safari).
        </div>
      )}

      {/* Tunggu Clerk selesai load sebelum render tombol */}
      {isLoaded && isSignedIn ? (
        // User sudah login → redirect ke dashboard, jangan buka modal
        <button
          id="btn-google-login"
          onClick={handleClickWhenSignedIn}
          className="w-full flex items-center justify-center gap-3 bg-[var(--accent)] text-[var(--accent-fg)] px-6 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
        >
          {buttonContent}
        </button>
      ) : (
        // User belum login → tampilkan SignInButton normal
        <SignInButton mode="modal" fallbackRedirectUrl={redirectAfter || "/dashboard"} signUpFallbackRedirectUrl={redirectAfter || "/dashboard"}>
          <button
            id="btn-google-login"
            className="w-full flex items-center justify-center gap-3 bg-[var(--accent)] text-[var(--accent-fg)] px-6 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            {buttonContent}
          </button>
        </SignInButton>
      )}
    </div>
  );
}
