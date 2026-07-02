export const SITE_NAME = 'Arsip Belajar';
export const SITE_DESCRIPTION = 'Your AI-powered personal study archive.';

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}

export function parseFolderInfo(rawName: string) {
  let displayName = rawName;
  let description = '';
  let color = '';
  let emoji = '📁';

  if (rawName && rawName.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawName);
      displayName = parsed.name || rawName;
      description = parsed.description || '';
      color = parsed.color || '';
      emoji = parsed.emoji || emoji;
    } catch {
      return { displayName: rawName, description: '', color: '', emoji: '📁' };
    }
  }

  return { displayName, description, color, emoji };
}
