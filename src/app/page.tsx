import LoginButton from '@/components/auth/LoginButton';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 bg-background">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground">
          Arsip Belajar
        </h1>
        
        <p className="text-lg sm:text-xl text-foreground/70 max-w-lg mx-auto">
          Your personal study archive. Upload images of your notes, and let AI extract and organize the text for you.
        </p>
        
        <div className="pt-8">
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
