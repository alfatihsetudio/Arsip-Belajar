'use client';

import { useEffect } from 'react';

export default function NoteViewTracker({ noteId }: { noteId: string }) {
  useEffect(() => {
    try {
      const viewedStr = localStorage.getItem('notes_last_viewed') || '{}';
      const viewed = JSON.parse(viewedStr);
      viewed[noteId] = Date.now();
      localStorage.setItem('notes_last_viewed', JSON.stringify(viewed));
    } catch (e) {
      console.error('Failed to save last viewed timestamp:', e);
    }
  }, [noteId]);

  return null;
}
